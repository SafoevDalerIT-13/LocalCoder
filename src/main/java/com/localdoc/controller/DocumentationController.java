package com.localdoc.controller;

import com.localdoc.dto.request.DocumentationRequest;
import com.localdoc.dto.response.DocumentationResponse;
import com.localdoc.service.DocumentationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docs")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class DocumentationController {
    DocumentationService docService;

    @PostMapping("/generate")
    public ResponseEntity<DocumentationResponse> generate(@RequestBody DocumentationRequest request) {
        log.info("Получен запрос на генерацию: templateCode={}, длина исходного кода={} символов",
                request.getTemplateCode(),
                request.getSourceCode() != null ? request.getSourceCode().length() : 0);

        long startTime = System.currentTimeMillis();
        String documentation = docService.generateDocumentation(
                request.getSourceCode(),
                request.getTemplateCode()
        );
        long durationMs = System.currentTimeMillis() - startTime;
        double durationSec = durationMs / 1000.0;
        double durationMin = durationSec / 60.0;

        log.info("Генерация завершена: templateCode={}, длина ответа={} символов, время выполнения={} мс ({:.1f} сек / {:.2f} мин)",
                request.getTemplateCode(),
                documentation != null ? documentation.length() : 0,
                durationMs,
                durationSec,
                durationMin);

        DocumentationResponse response = new DocumentationResponse(documentation, request.getTemplateCode());
        return ResponseEntity.ok(response);
    }
}