package com.localdoc.config;

import com.localdoc.entity.TemplateEntity;
import com.localdoc.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class TemplateInitializer implements CommandLineRunner {
    private final TemplatesConfig templatesConfig;
    private final TemplateRepository templateRepository;

    @Override
    public void run(String... args) {
        if (templateRepository.count() > 0) {
            log.info("Шаблоны уже есть в БД, инициализация пропущена");
            return;
        }
        templatesConfig.getTemplates().forEach((code, content) -> {
            TemplateEntity entity = new TemplateEntity(code, content,
                    "Шаблон " + code, LocalDateTime.now());
            templateRepository.save(entity);
            log.info("Шаблон {} сохранён в БД", code);
        });
        log.info("Загрузка шаблонов в БД завершена");
    }
}
