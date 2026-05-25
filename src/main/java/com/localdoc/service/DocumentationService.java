package com.localdoc.service;

import com.localdoc.config.TemplatesConfig;
import com.localdoc.exception.DocumentationGenerationException;
import com.localdoc.exception.InvalidRequestException;
import com.localdoc.exception.TemplateNotFoundException;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
@FieldDefaults(level = AccessLevel.PRIVATE,makeFinal = true)
@RequiredArgsConstructor
public class DocumentationService {
    ChatClient chatClient;
    TemplatesConfig templatesConfig;

    public String generateDocumentation(String sourceCode, String templateCode) {
        if (sourceCode == null || sourceCode.isBlank()) {
            throw new InvalidRequestException("Исходный код не может быть пустым");
        }
        if (templateCode == null || templateCode.isBlank()) {
            throw new InvalidRequestException("Код шаблона обязателен");
        }

        String template = templatesConfig.getTemplates().get(templateCode);
        if (template == null) {
            throw new TemplateNotFoundException(templateCode);
        }

        String prompt = template + "\n\n```java\n" + sourceCode + "\n```";
        try {
            return chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();
        } catch (Exception e) {
            throw new DocumentationGenerationException("Ошибка при генерации документации", e);
        }
    }
}