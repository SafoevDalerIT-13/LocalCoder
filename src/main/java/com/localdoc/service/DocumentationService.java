package com.localdoc.service;

import com.localdoc.config.TemplatesConfig;
import com.localdoc.exception.DocumentationGenerationException;
import com.localdoc.exception.InvalidRequestException;
import com.localdoc.exception.TemplateNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Slf4j
public class DocumentationService {
    ChatClient chatClient;
    TemplatesConfig templatesConfig;

    public String generateDocumentation(String sourceCode, String templateCode) {
        if (sourceCode == null || sourceCode.isBlank()) {
            log.warn("Исходный код пуст или null");
            throw new InvalidRequestException("Исходный код не может быть пустым");
        }
        if (templateCode == null || templateCode.isBlank()) {
            log.warn("Код шаблона пуст или null");
            throw new InvalidRequestException("Код шаблона обязателен");
        }

        log.debug("Поиск шаблона с кодом {}", templateCode);
        String template = templatesConfig.getTemplates().get(templateCode);
        if (template == null) {
            log.error("Шаблон с кодом {} не найден в конфигурации", templateCode);
            throw new TemplateNotFoundException(templateCode);
        }

        String prompt = template + "\n\n```java\n" + sourceCode + "\n```";
        log.debug("Промпт сформирован, длина={} символов", prompt.length());

        try {
            log.info("Отправка запроса к LLM...");
            String result = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();
            log.info("Ответ от LLM получен, длина={} символов", result != null ? result.length() : 0);
            return result;
        } catch (Exception e) {
            log.error("Ошибка при вызове LLM: {}", e.getMessage(), e);
            throw new DocumentationGenerationException("Ошибка при генерации документации", e);
        }
    }
}