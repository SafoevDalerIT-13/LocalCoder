package com.localdoc.controller;

import com.localdoc.dto.request.ProjectGenerateRequest;
import com.localdoc.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/docs/project")
@RequiredArgsConstructor
@Slf4j
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping("/scan")
    public ResponseEntity<?> scan(@RequestBody Map<String, String> body) {
        String path = body.get("path");
        if (path == null || path.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Путь обязателен"));
        }
        try {
            List<ProjectService.FileInfo> files = projectService.scanDirectory(path);
            String rootName = Path.of(path).getFileName().toString();
            return ResponseEntity.ok(Map.of("root", rootName, "files", files));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestBody List<Map<String, String>> uploadedFiles) {
        if (uploadedFiles == null || uploadedFiles.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Нет файлов"));
        }
        log.info("Загрузка проекта: {} файлов", uploadedFiles.size());
        try {
            List<ProjectService.UploadedFile> files = uploadedFiles.stream()
                    .map(m -> new ProjectService.UploadedFile(m.get("path"), m.get("content")))
                    .toList();
            ProjectService.UploadResult result = projectService.uploadProject(files);
            log.info("Проект загружен: projectId={}, root={}, файлов={}",
                    result.projectId(), result.root(), result.files().size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Ошибка загрузки проекта: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/preview-prompt")
    public ResponseEntity<?> previewPrompt(@RequestBody ProjectGenerateRequest req) {
        log.info("previewPrompt: {} selections", req.getSelections() != null ? req.getSelections().size() : 0);
        if (req.getSelections() == null || req.getSelections().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Нет выбранных кусков кода"));
        }
        try {
            String prompt = projectService.buildPromptFromSelections(req.getProjectId(), req.getSelections());
            return ResponseEntity.ok(Map.of("prompt", prompt));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/generate-from-selections")
    public ResponseEntity<?> generateFromSelections(@RequestBody ProjectGenerateRequest req) {
        log.info("generateFromSelections: {} selections, template={}",
                req.getSelections() != null ? req.getSelections().size() : 0, req.getTemplateCode());
        if (req.getSelections() == null || req.getSelections().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Нет выбранных кусков кода"));
        }
        try {
            ProjectService.ChatResult result = projectService.generateFromSelections(
                    req.getProjectId(), req.getSelections(),
                    req.getTemplateCode(),
                    req.getAlgorithmCode(), req.getAlgorithmDescription(), req.getAlgorithmLink(),
                    req.getAuthorities(), req.getSlaP95(), req.getSlaP99());
            log.info("generateFromSelections завершён: chatId={}", result.chatId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("generateFromSelections ошибка: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/read")
    public ResponseEntity<?> readFile(@RequestParam String path) {
        log.debug("Чтение файла: {}", path);
        if (path == null || path.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Путь обязателен"));
        }
        try {
            String content = projectService.readFileContent(path);
            log.debug("Файл прочитан: {} символов", content.length());
            return ResponseEntity.ok(Map.of("content", content));
        } catch (Exception e) {
            log.error("Ошибка чтения файла {}: {}", path, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
