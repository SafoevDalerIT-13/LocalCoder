package com.localdoc.service;

import com.localdoc.entity.ChatEntity;
import com.localdoc.exception.DocumentationGenerationException;
import com.localdoc.exception.InvalidRequestException;
import com.localdoc.exception.TemplateNotFoundException;
import com.localdoc.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.*;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentationService {
    final ChatClient chatClient;
    final TemplateRepository templateRepository;
    final ChatSessionManager sessionManager;

    public String generateDocumentation(UUID chatId, String sourceCode, String templateCode) {
        if (sourceCode == null || sourceCode.isBlank()) {
            log.warn("Исходный код пуст или null");
            throw new InvalidRequestException("Исходный код не может быть пустым");
        }
        if (templateCode == null || templateCode.isBlank()) {
            log.warn("Код шаблона пуст или null");
            throw new InvalidRequestException("Код шаблона обязателен");
        }

        log.debug("Поиск шаблона с кодом {}", templateCode);
        String template = templateRepository.findById(templateCode)
                .map(com.localdoc.entity.TemplateEntity::getContent)
                .orElseThrow(() -> new TemplateNotFoundException(templateCode));

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

    public String generateCorrection(UUID chatId, String userMessage) {
        if (chatId == null) {
            throw new InvalidRequestException("ID чата обязателен");
        }
        if (userMessage == null || userMessage.isBlank()) {
            throw new InvalidRequestException("Сообщение не может быть пустым");
        }

        ChatEntity chat = sessionManager.getChat(chatId);
        String templateCode = chat.getTemplateCode();
        String template = templateCode != null
                ? templateRepository.findById(templateCode)
                        .map(com.localdoc.entity.TemplateEntity::getContent)
                        .orElse("Исправь документацию на основе замечания.")
                : "Исправь документацию на основе замечания.";

        String reminder = "\n\nИсправь документацию на основе замечания выше. Выведи ТОЛЬКО готовый XHTML, без обрамляющих ```html, ```xml или любых других маркдаун-блоков. Сразу начинай вывод с XHTML-тегов.";
        sessionManager.addMessage(chatId, new UserMessage(userMessage + reminder));

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(template));
        messages.addAll(sessionManager.getMessages(chatId));

        log.debug("Корректировка: чат={}, длина истории={} сообщений", chatId, messages.size());

        try {
            log.info("Отправка запроса на корректировку к LLM...");
            String result = chatClient.prompt(new Prompt(messages))
                    .call()
                    .content();
            log.info("Ответ на корректировку получен, длина={} символов", result != null ? result.length() : 0);

            if (result != null) {
                sessionManager.addMessage(chatId, new AssistantMessage(result));
            }
            return result;
        } catch (Exception e) {
            log.error("Ошибка при корректировке: {}", e.getMessage(), e);
            throw new DocumentationGenerationException("Ошибка при корректировке документации", e);
        }
    }
}
