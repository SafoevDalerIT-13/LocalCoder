package com.localdoc.controller;

import com.localdoc.dto.request.CorrectionRequest;
import com.localdoc.dto.request.DocumentationRequest;
import com.localdoc.dto.response.DocumentationResponse;
import com.localdoc.service.ChatSessionManager;
import com.localdoc.service.DocumentationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/docs")
@RequiredArgsConstructor
@Slf4j
public class DocumentationController {
    final DocumentationService docService;
    final ChatSessionManager sessionManager;

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

        String sessionId = sessionManager.createSession(
                request.getSourceCode(),
                request.getTemplateCode()
        );
        if (documentation != null) {
            sessionManager.addMessage(sessionId, new AssistantMessage(documentation));
        }

        List<String> versions = sessionManager.getAssistantMessages(sessionId);

        log.info("Генерация завершена: templateCode={}, длина ответа={} символов, время={:.1f} сек, сессия={}",
                request.getTemplateCode(),
                documentation != null ? documentation.length() : 0,
                durationSec,
                sessionId);

        DocumentationResponse response = new DocumentationResponse(
                documentation, request.getTemplateCode(), sessionId,
                versions.size() - 1, versions);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/correct")
    public ResponseEntity<DocumentationResponse> correct(@RequestBody CorrectionRequest request) {
        log.info("Получен запрос на корректировку: sessionId={}, длина сообщения={} символов",
                request.getSessionId(),
                request.getMessage() != null ? request.getMessage().length() : 0);

        long startTime = System.currentTimeMillis();
        String corrected = docService.generateCorrection(
                request.getSessionId(),
                request.getMessage()
        );
        long durationMs = System.currentTimeMillis() - startTime;
        double durationSec = durationMs / 1000.0;

        List<String> versions = sessionManager.getAssistantMessages(request.getSessionId());

        log.info("Корректировка завершена: sessionId={}, длина ответа={} символов, время={:.1f} сек",
                request.getSessionId(),
                corrected != null ? corrected.length() : 0,
                durationSec);

        DocumentationResponse response = new DocumentationResponse(
                corrected, null, request.getSessionId(),
                versions.size() - 1, versions);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/versions/{sessionId}")
    public ResponseEntity<List<String>> getVersions(@PathVariable String sessionId) {
        return ResponseEntity.ok(sessionManager.getAssistantMessages(sessionId));
    }

    @GetMapping("/version/{sessionId}/{index}")
    public ResponseEntity<DocumentationResponse> getVersion(
            @PathVariable String sessionId, @PathVariable int index) {
        List<String> versions = sessionManager.getAssistantMessages(sessionId);
        if (index < 0 || index >= versions.size()) {
            return ResponseEntity.notFound().build();
        }
        DocumentationResponse response = new DocumentationResponse(
                versions.get(index), null, sessionId, index, versions);
        return ResponseEntity.ok(response);
    }
}
