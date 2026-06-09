package com.localdoc.controller;

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

    @SuppressWarnings("unchecked")
    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody Map<String, Object> body) {
        List<String> files = (List<String>) body.get("files");
        String templateCode = (String) body.get("templateCode");
        log.info("Генерация для {} файлов, шаблон={}", files != null ? files.size() : 0, templateCode);

        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Список файлов пуст"));
        }
        if (templateCode == null || templateCode.isBlank()) {
            templateCode = "200";
        }

        try {
            List<ProjectService.ProjectGenerateResult> results =
                    projectService.generateForFiles(files, templateCode);
            log.info("Генерация завершена: {} результатов", results.size());
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("Ошибка генерации: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> body) {
        String primaryFile = (String) body.get("primaryFile");
        List<String> contextFiles = (List<String>) body.get("contextFiles");
        String instruction = (String) body.get("instruction");
        String templateCode = (String) body.get("templateCode");

        if (primaryFile == null || primaryFile.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Не выбран основной файл для документирования"));
        }

        log.info("Запрос на генерацию: primaryFile={}, contextFiles={}, templateCode={}",
                primaryFile, contextFiles != null ? contextFiles.size() : 0, templateCode);

        try {
            ProjectService.ChatResult result = projectService.chatWithFiles(primaryFile,
                    contextFiles != null ? contextFiles : List.of(),
                    instruction, templateCode != null ? templateCode : "200");
            log.info("Генерация завершена: chatId={}", result.chatId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Ошибка генерации: {}", e.getMessage(), e);
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
