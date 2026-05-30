package com.localdoc.service;

import com.localdoc.config.TemplatesConfig;
import com.localdoc.exception.DocumentationGenerationException;
import com.localdoc.exception.InvalidRequestException;
import com.localdoc.exception.TemplateNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.*;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentationService {
    final ChatClient chatClient;
    final TemplatesConfig templatesConfig;
    final ChatSessionManager sessionManager;

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

    public String generateCorrection(String sessionId, String userMessage) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new InvalidRequestException("ID сессии обязателен");
        }
        if (userMessage == null || userMessage.isBlank()) {
            throw new InvalidRequestException("Сообщение не может быть пустым");
        }

        ChatSessionManager.SessionEntry session = sessionManager.getSession(sessionId);
        String template = templatesConfig.getTemplates().get(session.getTemplateCode());
        if (template == null) {
            throw new TemplateNotFoundException(session.getTemplateCode());
        }

        String reminder = "\n\nИсправь документацию на основе замечания выше. Выведи ТОЛЬКО готовый XHTML, без обрамляющих ```html, ```xml или любых других маркдаун-блоков. Сразу начинай вывод с XHTML-тегов.";
        sessionManager.addMessage(sessionId, new UserMessage(userMessage + reminder));

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(template));
        messages.addAll(session.getMessages());

        log.debug("Корректировка: сессия={}, длина истории={} сообщений", sessionId, messages.size());

        try {
            log.info("Отправка запроса на корректировку к LLM...");
            String result = chatClient.prompt(new Prompt(messages))
                    .call()
                    .content();
            log.info("Ответ на корректировку получен, длина={} символов", result != null ? result.length() : 0);

            if (result != null) {
                sessionManager.addMessage(sessionId, new AssistantMessage(result));
            }
            return result;
        } catch (Exception e) {
            log.error("Ошибка при корректировке: {}", e.getMessage(), e);
            throw new DocumentationGenerationException("Ошибка при корректировке документации", e);
        }
    }
}
