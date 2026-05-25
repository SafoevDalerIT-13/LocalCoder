package com.localdoc.ai;

import com.localdoc.config.TemplatesConfig;
import lombok.AccessLevel;
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
        String template = templatesConfig.getTemplates()
                .getOrDefault(templateCode, templatesConfig.getTemplates().get("200"));

        if (template == null) {
            throw new IllegalStateException("Шаблон 200 не найден в конфигурации");
        }

        String prompt = template + "\n\n```java\n" + sourceCode + "\n```";
        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }
}