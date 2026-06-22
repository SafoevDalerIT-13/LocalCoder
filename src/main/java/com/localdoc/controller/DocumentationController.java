package com.localdoc.controller;

import com.localdoc.dto.request.ChatStateRequest;
import com.localdoc.dto.request.CorrectionRequest;
import com.localdoc.dto.request.CreateChatRequest;
import com.localdoc.dto.request.DocumentationRequest;
import com.localdoc.dto.response.ChatResponse;
import com.localdoc.dto.response.CreateChatResponse;
import com.localdoc.dto.response.DocumentationResponse;
import com.localdoc.entity.ChatEntity;
import com.localdoc.repository.TemplateRepository;
import com.localdoc.service.ChatSessionManager;
import com.localdoc.service.DocumentationService;
import com.localdoc.service.ExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/docs")
@RequiredArgsConstructor
@Slf4j
public class DocumentationController {
    final DocumentationService docService;
    final ChatSessionManager sessionManager;
    final TemplateRepository templateRepository;
    final ExportService exportService;

    @PostMapping("/chat")
    public ResponseEntity<CreateChatResponse> createChat(@RequestBody CreateChatRequest request) {
        ChatEntity chat = sessionManager.createChat(request.getName(), request.getMode());
        log.info("Создан новый чат: id={}, name={}, mode={}", chat.getId(), chat.getName(), chat.getMode());
        return ResponseEntity.ok(new CreateChatResponse(chat.getId(), chat.getName(), chat.getMode()));
    }

    @GetMapping("/chats")
    public ResponseEntity<List<ChatResponse>> getChats() {
        List<ChatResponse> chats = sessionManager.listChats().stream()
                .map(ChatResponse::from)
                .toList();
        return ResponseEntity.ok(chats);
    }

    @PutMapping("/chat/{chatId}/state")
    public ResponseEntity<Void> updateChatState(@PathVariable UUID chatId,
                                                 @RequestBody ChatStateRequest request) {
        sessionManager.updateChatState(chatId, request.getFrontendState());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/chat/{chatId}")
    public ResponseEntity<Void> deleteChat(@PathVariable UUID chatId) {
        sessionManager.deleteChat(chatId);
        log.info("Чат удалён: id={}", chatId);
        return ResponseEntity.ok().build();
    }

    @PutMapping(value = "/chat/{chatId}/rename", consumes = "text/plain")
    public ResponseEntity<Void> renameChat(@PathVariable UUID chatId, @RequestBody String newName) {
        sessionManager.renameChat(chatId, newName);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/generate")
    public ResponseEntity<DocumentationResponse> generate(@RequestBody DocumentationRequest request) {
        log.info("Получен запрос на генерацию: chatId={}, templateCode={}",
                request.getChatId(), request.getTemplateCode());

        UUID chatId = request.getChatId();

        sessionManager.updateTemplateCode(chatId, request.getTemplateCode());

        long startTime = System.currentTimeMillis();
        String documentation;
        try {
            documentation = docService.generateDocumentation(
                    chatId, request.getSourceCode(), request.getTemplateCode(),
                    request.getAlgorithmCode(), request.getAlgorithmDescription(),
                    request.getAlgorithmLink(),
                    request.getAuthorities(), request.getSlaP95(), request.getSlaP99()
            );
        } catch (Exception e) {
            if (docService.isCancelled(chatId)) {
                docService.clearCancelled(chatId);
                log.info("Генерация отменена: chatId={}, результат отброшен", chatId);
                List<String> existingVersions = sessionManager.getAssistantMessages(chatId);
                return ResponseEntity.ok(new DocumentationResponse(
                        null, request.getTemplateCode(), chatId.toString(),
                        existingVersions.size() - 1, existingVersions, request.getAlgorithmCode(),
                        request.getAlgorithmDescription(), request.getAlgorithmLink(),
                        request.getAuthorities(), request.getSlaP95(), request.getSlaP99()));
            }
            throw e;
        }
        long durationMs = System.currentTimeMillis() - startTime;
        double durationSec = durationMs / 1000.0;

        if (docService.isCancelled(chatId)) {
            docService.clearCancelled(chatId);
            log.info("Генерация отменена: chatId={}, результат отброшен", chatId);
            List<String> existingVersions = sessionManager.getAssistantMessages(chatId);
            return ResponseEntity.ok(new DocumentationResponse(
                    null, request.getTemplateCode(), chatId.toString(),
                    existingVersions.size() - 1, existingVersions, request.getAlgorithmCode(),
                    request.getAlgorithmDescription(), request.getAlgorithmLink(),
                    request.getAuthorities(), request.getSlaP95(), request.getSlaP99()));
        }

        sessionManager.addMessage(chatId, new UserMessage("Сгенерируй документацию для кода:\n\n" + request.getSourceCode() + "\n\nШаблон: " + request.getTemplateCode()));
        if (documentation != null) {
            sessionManager.addMessage(chatId, new AssistantMessage(documentation));
        }

        List<String> versions = sessionManager.getAssistantMessages(chatId);

        log.info("Генерация завершена: chatId={}, длина ответа={} символов, время={:.1f} сек",
                chatId, documentation != null ? documentation.length() : 0, durationSec);

        DocumentationResponse response = new DocumentationResponse(
                documentation, request.getTemplateCode(), chatId.toString(),
                versions.size() - 1, versions, request.getAlgorithmCode(),
                request.getAlgorithmDescription(), request.getAlgorithmLink(),
                request.getAuthorities(), request.getSlaP95(), request.getSlaP99());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate/cancel/{chatId}")
    public ResponseEntity<Void> cancelGenerate(@PathVariable UUID chatId) {
        docService.cancelGeneration(chatId);
        log.info("Запрос на отмену генерации: chatId={}", chatId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/correct")
    public ResponseEntity<DocumentationResponse> correct(@RequestBody CorrectionRequest request) {
        UUID chatId = request.getChatId();
        log.info("Получен запрос на корректировку: chatId={}", chatId);

        long startTime = System.currentTimeMillis();
        String corrected;
        try {
            corrected = docService.generateCorrection(chatId, request.getMessage());
        } catch (Exception e) {
            if (docService.isCancelled(chatId)) {
                docService.clearCancelled(chatId);
                log.info("Корректировка отменена: chatId={}, результат отброшен", chatId);
                List<String> existingVersions = sessionManager.getAssistantMessages(chatId);
                return ResponseEntity.ok(new DocumentationResponse(
                        null, null, chatId.toString(),
                        existingVersions.size() - 1, existingVersions, null, null, null, null, null, null));
            }
            throw e;
        }
        long durationMs = System.currentTimeMillis() - startTime;
        double durationSec = durationMs / 1000.0;

        if (docService.isCancelled(chatId)) {
            docService.clearCancelled(chatId);
            log.info("Корректировка отменена: chatId={}, результат отброшен", chatId);
            List<String> existingVersions = sessionManager.getAssistantMessages(chatId);
            return ResponseEntity.ok(new DocumentationResponse(
                    null, null, chatId.toString(),
                    existingVersions.size() - 1, existingVersions, null, null, null, null, null, null));
        }

        List<String> versions = sessionManager.getAssistantMessages(chatId);

        log.info("Корректировка завершена: chatId={}, время={:.1f} сек", chatId, durationSec);

        DocumentationResponse response = new DocumentationResponse(
                corrected, null, chatId.toString(),
                versions.size() - 1, versions, null, null, null, null, null, null);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/chat/{chatId}/versions")
    public ResponseEntity<List<String>> getVersions(@PathVariable UUID chatId) {
        return ResponseEntity.ok(sessionManager.getAssistantMessages(chatId));
    }

    @GetMapping("/chat/{chatId}/version/{index}")
    public ResponseEntity<DocumentationResponse> getVersion(
            @PathVariable UUID chatId, @PathVariable int index) {
        List<String> versions = sessionManager.getAssistantMessages(chatId);
        if (index < 0 || index >= versions.size()) {
            return ResponseEntity.notFound().build();
        }
        DocumentationResponse response = new DocumentationResponse(
                versions.get(index), null, chatId.toString(), index, versions, null, null, null, null, null, null);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export/{chatId}/{versionIndex}")
    public ResponseEntity<byte[]> export(
            @PathVariable UUID chatId,
            @PathVariable int versionIndex,
            @RequestParam(defaultValue = "html") String format) {
        List<String> versions = sessionManager.getAssistantMessages(chatId);
        if (versionIndex < 0 || versionIndex >= versions.size()) {
            return ResponseEntity.notFound().build();
        }
        String xhtml = versions.get(versionIndex);
        if (xhtml == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            byte[] data;
            String ext;
            MediaType mediaType;

            switch (format) {
                case "pdf":
                    data = exportService.exportPdf(xhtml);
                    ext = "pdf";
                    mediaType = MediaType.APPLICATION_PDF;
                    break;
                case "docx":
                    data = exportService.exportDocx(xhtml);
                    ext = "docx";
                    mediaType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                    break;
                case "md":
                case "markdown":
                    data = exportService.exportMarkdown(xhtml);
                    ext = "md";
                    mediaType = MediaType.parseMediaType("text/markdown");
                    break;
                default:
                    data = exportService.exportHtml(xhtml);
                    ext = "html";
                    mediaType = MediaType.TEXT_HTML;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(mediaType);
            headers.setContentDispositionFormData("attachment", "documentation." + ext);
            return ResponseEntity.ok().headers(headers).body(data);
        } catch (Exception e) {
            log.error("Ошибка экспорта: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/templates")
    public ResponseEntity<List<String>> getTemplateCodes() {
        List<String> codes = templateRepository.findAll().stream()
                .map(com.localdoc.entity.TemplateEntity::getCode)
                .toList();
        return ResponseEntity.ok(codes);
    }
}
