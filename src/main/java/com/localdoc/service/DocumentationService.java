package com.localdoc.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localdoc.entity.ChatEntity;
import com.localdoc.exception.DocumentationGenerationException;
import com.localdoc.exception.InvalidRequestException;
import com.localdoc.exception.TemplateNotFoundException;
import com.localdoc.model.docstructure.AlgorithmStep;
import com.localdoc.model.docstructure.Document211;
import com.localdoc.model.docstructure.Document230;
import com.localdoc.model.docstructure.ErrorInfo;
import com.localdoc.model.docstructure.FieldInfo;
import com.localdoc.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.*;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentationService {
    final ChatClient chatClient;
    final TemplateRepository templateRepository;
    final ChatSessionManager sessionManager;
    final XhtmlRenderService xhtmlRenderService;
    final ObjectMapper objectMapper;
    private final ConcurrentHashMap<UUID, Boolean> generationCancelled = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, Thread> generationThreads = new ConcurrentHashMap<>();

    public void cancelGeneration(UUID chatId) {
        generationCancelled.put(chatId, true);
        Thread thread = generationThreads.get(chatId);
        if (thread != null) {
            thread.interrupt();
        }
    }

    public boolean isCancelled(UUID chatId) {
        return generationCancelled.getOrDefault(chatId, false);
    }

    public void clearCancelled(UUID chatId) {
        generationCancelled.remove(chatId);
    }

    private void checkCancelled(UUID chatId) {
        if (isCancelled(chatId) || Thread.currentThread().isInterrupted()) {
            throw new DocumentationGenerationException("Генерация прервана пользователем");
        }
    }

    private String callLlm(UUID chatId, Prompt prompt) {
        checkCancelled(chatId);
        try {
            String result = chatClient.prompt(prompt).call().content();
            checkCancelled(chatId);
            return result;
        } catch (DocumentationGenerationException e) {
            throw e;
        } catch (Exception e) {
            if (isCancelled(chatId) || Thread.currentThread().isInterrupted()) {
                throw new DocumentationGenerationException("Генерация прервана пользователем");
            }
            throw e;
        }
    }

    public String generateDocumentation(UUID chatId, String sourceCode, String templateCode, String algorithmCode,
                                         String algorithmDescription, String algorithmLink,
                                         String authorities, String slaP95, String slaP99) {
        if (sourceCode == null || sourceCode.isBlank()) {
            log.warn("Исходный код пуст или null");
            throw new InvalidRequestException("Исходный код не может быть пустым");
        }
        if (templateCode == null || templateCode.isBlank()) {
            log.warn("Код шаблона пуст или null");
            throw new InvalidRequestException("Код шаблона обязателен");
        }

        clearCancelled(chatId);
        generationThreads.put(chatId, Thread.currentThread());
        try {
            if ("211".equals(templateCode)) {
                return generate211(chatId, sourceCode, algorithmCode, algorithmDescription, algorithmLink, authorities, slaP95, slaP99);
            }

            if ("230".equals(templateCode)) {
                return generate230(chatId, sourceCode, algorithmCode, algorithmDescription, algorithmLink);
            }

            return generateLegacy(chatId, sourceCode, templateCode, algorithmCode, authorities, slaP95, slaP99);
        } finally {
            generationThreads.remove(chatId);
        }
    }

    private String generate211(UUID chatId, String sourceCode,
                                String algorithmCode, String algorithmDescription, String algorithmLink,
                                String authorities, String slaP95, String slaP99) {
        log.info("Генерация 211: AI → JSON → XHTML");

        try {
            String json = callLlmForJson(chatId, sourceCode, algorithmCode, authorities, slaP95, slaP99);
            checkCancelled(chatId);
            Document211 doc = parseDocumentFromJson(json, algorithmCode, algorithmDescription, algorithmLink, authorities, slaP95, slaP99);
            String xhtml = xhtmlRenderService.render211(doc);
            log.info("Сгенерирован XHTML через JSON (211): длина={}", xhtml.length());
            return xhtml;
        } catch (DocumentationGenerationException e) {
            throw e;
        } catch (Exception e) {
            log.warn("JSON-подход не сработал, падаем на XHTML: {}", e.getMessage());
        }

        return generateLegacyFallback(chatId, sourceCode, algorithmCode, authorities, slaP95, slaP99);
    }

    private String generate230(UUID chatId, String sourceCode,
                                 String algorithmCode, String algorithmDescription, String algorithmLink) {
        log.info("Генерация 230: AI → JSON → XHTML");

        try {
            String json = callLlmFor230Json(chatId, sourceCode);
            checkCancelled(chatId);
            Document230 doc = parseDocument230FromJson(json, algorithmCode, algorithmDescription, algorithmLink);
            String xhtml = xhtmlRenderService.render230(doc);
            log.info("Сгенерирован XHTML через JSON (230): длина={}", xhtml.length());
            return xhtml;
        } catch (DocumentationGenerationException e) {
            throw e;
        } catch (Exception e) {
            log.warn("JSON-подход 230 не сработал, падаем на Legacy: {}", e.getMessage());
        }

        return generateLegacy(chatId, sourceCode, "230", algorithmCode, null, null, null);
    }

    private String callLlmFor230Json(UUID chatId, String sourceCode) {
        String systemPrompt = """
                Ты — технический писатель, анализирующий Java-код.
                Проанализируй код и верни ТОЛЬКО валидный JSON.
                Никаких markdown-обрамлений, пояснений или XHTML.

                ПРАВИЛА:
                1. Найди главный публичный метод — это документируемый метод.
                2. Входные/выходные параметры — краткое описание.
                3. Ожидаемый результат — что делает метод.
                4. Шаги алгоритма — детальное пошаговое описание.
                   Первый шаг всегда заголовок основного сценария: {"number": "ОС.", "action": "название основного сценария"}.
                   Далее идут шаги с номерами 1, 2, 3... с полями: number, action, as (значение столбца АС, "—" если нет).
                   Если в коде есть обработка ошибок — добавь альтернативный сценарий:
                   {"number": "АС1.", "action": "Непредвиденная ошибка"} с подшагами 1, 2...
                5. Поле "as" — указывает на альтернативный сценарий (например "АС1"), или "—" если нет.

                JSON СТРУКТУРА ОТВЕТА (строго соблюдай):
                {
                  "methodName": "имя_метода",
                  "inputParamsDescription": "описание входных параметров",
                  "outputParamsDescription": "описание выходных параметров",
                  "expectedResult": "описание ожидаемого результата",
                  "steps": [
                    {"number": "ОС.", "action": "Название основного сценария"},
                    {"number": "1", "action": "текст действия", "as": "—"},
                    {"number": "2", "action": "текст действия", "as": "—"},
                    {"number": "АС1.", "action": "Название альтернативного сценария"},
                    {"number": "1", "action": "текст действия", "as": "—"}
                  ]
                }

                ВАЖНО: Верни ТОЛЬКО JSON.""";
        String userContent = "КОД:\n" + sourceCode;

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));
        messages.add(new UserMessage(userContent));

        String result = callLlm(chatId, new Prompt(messages));

        if (result != null) {
            result = result.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)```\\s*$", "").trim();
        }
        log.debug("Ответ AI JSON (230): длина={}", result != null ? result.length() : 0);
        return result;
    }

    @SuppressWarnings("unchecked")
    private Document230 parseDocument230FromJson(String json,
                                                  String algorithmCode, String algorithmDescription, String algorithmLink) throws Exception {
        if (json == null || json.isBlank()) {
            throw new DocumentationGenerationException("Пустой JSON от AI");
        }

        Map<String, Object> root = objectMapper.readValue(json,
                new TypeReference<Map<String, Object>>() {});

        String methodName = String.valueOf(root.getOrDefault("methodName", "Unknown"));
        String inputParamsDesc = String.valueOf(root.getOrDefault("inputParamsDescription", ""));
        String outputParamsDesc = String.valueOf(root.getOrDefault("outputParamsDescription", ""));
        String expectedResult = String.valueOf(root.getOrDefault("expectedResult", ""));

        List<AlgorithmStep> steps = new ArrayList<>();
        if (root.get("steps") instanceof List) {
            for (Object item : (List<?>) root.get("steps")) {
                if (item instanceof Map) {
                    Map<String, Object> m = (Map<String, Object>) item;
                    steps.add(AlgorithmStep.builder()
                            .number(String.valueOf(m.getOrDefault("number", "")))
                            .action(String.valueOf(m.getOrDefault("action", "")))
                            .as(String.valueOf(m.getOrDefault("as", "\u2014")))
                            .build());
                }
            }
        }

        return Document230.builder()
                .methodName(methodName)
                .algorithmCode(algorithmCode)
                .algorithmDescription(algorithmDescription)
                .algorithmLink(algorithmLink)
                .inputParamsDescription(inputParamsDesc)
                .outputParamsDescription(outputParamsDesc)
                .expectedResult(expectedResult)
                .steps(steps)
                .build();
    }

    private String callLlmForJson(UUID chatId, String sourceCode,
                                    String algorithmCode, String authorities,
                                    String slaP95, String slaP99) {
        String systemPrompt = """
                Ты — технический писатель, анализирующий Java-код.
                Проанализируй все классы в предоставленном коде и верни ТОЛЬКО валидный JSON.
                Никаких markdown-обрамлений (```json), пояснений или XHTML.

                ПРАВИЛА:
                1. Найди главный публичный метод — это документируемый метод.
                2. Для каждого параметра метода найди его DTO-класс (определён в этом же коде).
                3. Рекурсивно извлеки ВСЕ поля каждого DTO (включая поля родительских классов через extends).
                4. Используй точечную нотацию для вложенных полей: request.userMedicalEntityID
                5. НЕ показывай просто имя DTO как одну строку — раскрывай все его поля.
                6. Для каждого поля определи:
                   - Тип (int, long, String, List<...>, LocalDate, BigDecimal и т.д.)
                   - Обязательность: @NotNull/@NotBlank/@NotEmpty + не List → "Да/1..1";
                     если List → "Нет/0..*"; если @Nullable → "Нет/0..1"; иначе "Нет/0..1"
                7. Для выходных параметров в поле "dbMapping" укажи маппинг на БД ( @Column, @Table ), если есть.
                8. Для ошибок: найди throws, throw new, try-catch, enum с кодами ошибок.
                9. Описания на русском, кратко (1 фраза).

                JSON СТРУКТУРА ОТВЕТА (строго соблюдай):
                {
                  "methodName": "имя_метода",
                  "description": "описание метода",
                  "inputParams": [
                    {"name": "имя.с.точкой", "type": "тип", "required": "Да/1..1", "description": "описание", "comment": ""}
                  ],
                  "outputParams": [
                    {"name": "имя.с.точкой", "type": "тип", "required": "Да/1..1", "description": "описание", "dbMapping": ""}
                  ],
                  "errors": [
                    {"code": "S001", "text": "текст ошибки"}
                  ]
                }

                ВАЖНО: Верни ТОЛЬКО JSON. Никаких пояснений, markdown, XHTML.""";
        String userContent = "КОД:\n" + sourceCode;

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));
        messages.add(new UserMessage(userContent));

        log.debug("Промпт JSON (211): системный={} символов, код={} символов",
                systemPrompt.length(), sourceCode.length());

        String result = callLlm(chatId, new Prompt(messages));

        if (result != null) {
            result = result.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)```\\s*$", "").trim();
        }
        log.debug("Ответ AI JSON: длина={}", result != null ? result.length() : 0);
        return result;
    }

    @SuppressWarnings("unchecked")
    private Document211 parseDocumentFromJson(String json,
                                               String algorithmCode, String algorithmDescription, String algorithmLink,
                                               String authorities,
                                               String slaP95, String slaP99) throws Exception {
        if (json == null || json.isBlank()) {
            throw new DocumentationGenerationException("Пустой JSON от AI");
        }

        Map<String, Object> root = objectMapper.readValue(json,
                new TypeReference<Map<String, Object>>() {});

        String methodName = String.valueOf(root.getOrDefault("methodName", "Unknown"));
        String description = String.valueOf(root.getOrDefault("description", ""));

        List<FieldInfo> inputParams = parseFieldList(root.get("inputParams"));
        List<FieldInfo> outputParams = parseFieldList(root.get("outputParams"));

        List<ErrorInfo> errors = new ArrayList<>();
        if (root.get("errors") instanceof List) {
            for (Object item : (List<?>) root.get("errors")) {
                if (item instanceof Map) {
                    Map<String, Object> m = (Map<String, Object>) item;
                    errors.add(ErrorInfo.builder()
                            .code(String.valueOf(m.getOrDefault("code", "")))
                            .text(String.valueOf(m.getOrDefault("text", "")))
                            .build());
                }
            }
        }

        return Document211.builder()
                .methodName(methodName)
                .description(description)
                .algorithmCode(algorithmCode)
                .algorithmDescription(algorithmDescription)
                .algorithmLink(algorithmLink)
                .authorities(authorities)
                .slaP95(slaP95)
                .slaP99(slaP99)
                .inputParams(inputParams)
                .outputParams(outputParams)
                .errors(errors)
                .build();
    }

    @SuppressWarnings("unchecked")
    private List<FieldInfo> parseFieldList(Object raw) {
        List<FieldInfo> result = new ArrayList<>();
        if (!(raw instanceof List)) return result;
        for (Object item : (List<?>) raw) {
            if (item instanceof Map) {
                Map<String, Object> m = (Map<String, Object>) item;
                result.add(FieldInfo.builder()
                        .name(String.valueOf(m.getOrDefault("name", "")))
                        .type(String.valueOf(m.getOrDefault("type", "")))
                        .required(String.valueOf(m.getOrDefault("required", "Нет/0..1")))
                        .description(String.valueOf(m.getOrDefault("description", "")))
                        .comment(String.valueOf(m.getOrDefault("comment", "")))
                        .dbMapping(String.valueOf(m.getOrDefault("dbMapping", "")))
                        .build());
            }
        }
        return result;
    }

    private String generateLegacyFallback(UUID chatId, String sourceCode,
                                            String algorithmCode, String authorities,
                                            String slaP95, String slaP99) {
        log.info("Fallback 211: XHTML напрямую от AI");
        String fallbackTemplate = """
                Ты — технический писатель. Проанализируй код и создай документацию в чистом XHTML (Confluence Storage Format).
                Используй таблицы с колонками:
                - Общие сведения: Наименование метода | Описание метода | Алгоритм выполнения | Полномочия | SLA p95 | SLA p99
                - Входные параметры: Наименование параметра | Тип параметра | Обязательность/Множественность | Описание параметра | Комментарий
                - Выходные параметры: Наименование параметра | Тип параметра | Обязательность/Множественность | Описание параметра | Мапинг на БД
                - Список возможных ошибок: Код ошибки | Текст ошибки

                Раскрывай ВСЕ поля DTO с точечной нотацией (request.userMedicalEntityID).
                Не выдумывай информацию. Только XHTML теги, без markdown.
                Алгоритм выполнения: %s
                Полномочия: %s
                SLA p95: %s
                SLA p99: %s""".formatted(
                        algorithmCode != null && !algorithmCode.isBlank() ? algorithmCode : "А_ДДС_Х_Х",
                        authorities != null && !authorities.isBlank() ? authorities : "Не указаны",
                        slaP95 != null && !slaP95.isBlank() ? slaP95 : "&lt; 2 сек.",
                        slaP99 != null && !slaP99.isBlank() ? slaP99 : "&lt; 5 сек."
                );

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(fallbackTemplate));
        messages.add(new UserMessage("КОД:\n" + sourceCode + "\n\nСоздай XHTML документацию. Начни с <h1>."));

        String result = callLlm(chatId, new Prompt(messages));

        if (result != null) {
            result = result.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)```\\s*$", "").trim();
        }
        return result;
    }

    private String generateLegacy(UUID chatId, String sourceCode, String templateCode,
                                   String algorithmCode, String authorities, String slaP95, String slaP99) {
        log.debug("Поиск шаблона с кодом {}", templateCode);
        String template = templateRepository.findById(templateCode)
                .map(com.localdoc.entity.TemplateEntity::getContent)
                .orElseThrow(() -> new TemplateNotFoundException(templateCode));

        template = template.replace("{algorithmCode}",
                algorithmCode != null && !algorithmCode.isBlank() ? algorithmCode : "А_ДДС_Х_Х");
        template = template.replace("{authorities}",
                authorities != null && !authorities.isBlank() ? authorities : "Не указаны");
        template = template.replace("{slaP95}",
                slaP95 != null && !slaP95.isBlank() ? slaP95 : "&lt; 2 сек.");
        template = template.replace("{slaP99}",
                slaP99 != null && !slaP99.isBlank() ? slaP99 : "&lt; 5 сек.");

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(template));
        messages.add(new UserMessage("Проанализируй этот код и создай документацию строго по инструкции выше (только XHTML, без markdown):\n\n" + sourceCode));

        log.debug("Промпт сформирован, длина={} символов", template.length() + sourceCode.length());

        try {
            log.info("Отправка запроса к LLM (legacy)...");
            String result = callLlm(chatId, new Prompt(messages));
            log.info("Ответ от LLM получен, длина={} символов", result != null ? result.length() : 0);

            if (result != null) {
                result = result.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)```\\s*$", "").trim();
            }
            return result;
        } catch (Exception e) {
            log.error("Ошибка при вызове LLM: {}", e.getMessage(), e);
            throw new DocumentationGenerationException("Ошибка при генерации документации", e);
        }
    }

    public String generateCorrection(UUID chatId, String userMessage) {
        if (chatId == null) {
            throw new InvalidRequestException("ID чата обязателен");
        }
        if (userMessage == null || userMessage.isBlank()) {
            throw new InvalidRequestException("Сообщение не может быть пустым");
        }

        clearCancelled(chatId);
        generationThreads.put(chatId, Thread.currentThread());
        try {
            ChatEntity chat = sessionManager.getChat(chatId);
            String templateCode = chat.getTemplateCode();
            String template = templateCode != null
                    ? templateRepository.findById(templateCode)
                            .map(com.localdoc.entity.TemplateEntity::getContent)
                            .orElse("Исправь документацию на основе замечания.")
                    : "Исправь документацию на основе замечания.";

            String reminder = "\n\nИсправь документацию по замечанию выше. Выведи ТОЛЬКО готовый XHTML, без обрамляющих маркдаун-блоков. Начинай сразу с XHTML-тегов.";
            sessionManager.addMessage(chatId, new UserMessage(userMessage + reminder));

            List<Message> messages = new ArrayList<>();
            messages.add(new SystemMessage(template));
            messages.addAll(sessionManager.getMessages(chatId));

            log.debug("Корректировка: чат={}, длина истории={} сообщений", chatId, messages.size());

            log.info("Отправка запроса на корректировку к LLM...");
            String result = callLlm(chatId, new Prompt(messages));
            log.info("Ответ на корректировку получен, длина={} символов", result != null ? result.length() : 0);

            if (result != null) {
                result = result.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)```\\s*$", "").trim();
                sessionManager.addMessage(chatId, new AssistantMessage(result));
            }
            return result;
        } catch (DocumentationGenerationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Ошибка при корректировке: {}", e.getMessage(), e);
            throw new DocumentationGenerationException("Ошибка при корректировке документации", e);
        } finally {
            generationThreads.remove(chatId);
        }
    }
}
