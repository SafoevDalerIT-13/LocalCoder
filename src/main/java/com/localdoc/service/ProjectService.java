package com.localdoc.service;

import com.localdoc.entity.ChatEntity;
import com.localdoc.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ChatSessionManager sessionManager;
    private final DocumentationService documentationService;
    private final ChatClient chatClient;
    private final TemplateRepository templateRepository;

    public List<FileInfo> scanDirectory(String rootPath) throws IOException {
        Path root = Paths.get(rootPath).toAbsolutePath().normalize();
        if (!Files.isDirectory(root)) {
            throw new IllegalArgumentException("Директория не найдена: " + rootPath);
        }

        List<FileInfo> files = new ArrayList<>();
        try (var walk = Files.walk(root)) {
            walk.filter(Files::isRegularFile).forEach(path -> {
                String relativePath = root.relativize(path).toString().replace("\\", "/");
                files.add(new FileInfo(relativePath, path.toFile().length()));
            });
        }
        files.sort(Comparator.comparing(FileInfo::path));
        return files;
    }

    public List<ProjectGenerateResult> generateForFiles(List<String> filePaths, String templateCode) throws IOException {
        List<ProjectGenerateResult> results = new ArrayList<>();
        int total = filePaths.size();

        for (int i = 0; i < total; i++) {
            String filePath = filePaths.get(i);
            Path path = Paths.get(filePath).toAbsolutePath().normalize();
            if (!Files.isRegularFile(path)) {
                log.warn("Пропущен (не файл): {}", filePath);
                continue;
            }

            String content = Files.readString(path);
            String fileName = path.getFileName().toString();
            log.info("Генерация [{}/{}]: {}", i + 1, total, filePath);

            ChatEntity chat = sessionManager.createChat(fileName, "project");
            UUID chatId = chat.getId();

            String doc = documentationService.generateDocumentation(chatId, content, templateCode, null, null, null, null, null);

            sessionManager.addMessage(chatId, new UserMessage("Файл: " + filePath));
            if (doc != null) {
                sessionManager.addMessage(chatId, new AssistantMessage(doc));
            }

            results.add(new ProjectGenerateResult(chatId.toString(), filePath, doc));
        }

        return results;
    }

    public String readFileContent(String filePath) throws IOException {
        Path path = Paths.get(filePath).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new IllegalArgumentException("Файл не найден: " + filePath);
        }
        return Files.readString(path);
    }

    public ChatResult chatWithFiles(String primaryFile, List<String> contextFiles, String instruction, String templateCode) throws IOException {
        Path primaryPath = Paths.get(primaryFile).toAbsolutePath().normalize();
        if (!Files.isRegularFile(primaryPath)) {
            throw new IllegalArgumentException("Файл не найден: " + primaryFile);
        }
        String primaryContent = Files.readString(primaryPath);

        String template = templateRepository.findById(templateCode)
                .map(com.localdoc.entity.TemplateEntity::getContent)
                .orElse("Создай документацию для предоставленного кода в формате XHTML.");

        StringBuilder prompt = new StringBuilder();
        prompt.append(template).append("\n\n");
        if (instruction != null && !instruction.isBlank()) {
            prompt.append("Дополнительные указания от пользователя: ").append(instruction).append("\n\n");
        }
        prompt.append("Основной файл для документирования:\n");
        prompt.append("// ===== ").append(primaryPath.getFileName()).append(" =====\n");
        prompt.append(primaryContent).append("\n\n");

        if (contextFiles != null && !contextFiles.isEmpty()) {
            prompt.append("Контекст (зависимости, DTO, утилиты — документировать их не нужно, только используй для понимания):\n");
            for (String cf : contextFiles) {
                if (cf.equals(primaryFile)) continue;
                Path cfPath = Paths.get(cf).toAbsolutePath().normalize();
                if (!Files.isRegularFile(cfPath)) continue;
                String cfContent = Files.readString(cfPath);
                prompt.append("// ===== ").append(cfPath.getFileName()).append(" =====\n");
                prompt.append(cfContent).append("\n\n");
            }
        }

        String fileName = primaryPath.getFileName().toString();
        ChatEntity chat = sessionManager.createChat(fileName, "project");
        UUID chatId = chat.getId();

        String userContent = prompt.toString();
        sessionManager.addMessage(chatId, new UserMessage(userContent));

        String result = chatClient.prompt()
                .user(userContent)
                .call()
                .content();

        if (result != null) {
            result = result.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)```\\s*$", "").trim();
            sessionManager.addMessage(chatId, new AssistantMessage(result));
        }

        List<String> versions = sessionManager.getAssistantMessages(chatId);
        return new ChatResult(chatId.toString(), result, versions, versions.size() - 1);
    }

    public UploadResult uploadProject(List<UploadedFile> uploadedFiles) throws IOException {
        String projectId = UUID.randomUUID().toString();
        Path projectDir = Path.of("./uploaded", projectId).toAbsolutePath().normalize();
        Files.createDirectories(projectDir);

        for (UploadedFile f : uploadedFiles) {
            Path target = projectDir.resolve(f.path()).normalize();
            if (!target.startsWith(projectDir)) continue;
            Files.createDirectories(target.getParent());
            Files.writeString(target, f.content());
        }

        List<FileInfo> files = scanDirectory(projectDir.toString());
        return new UploadResult(projectId, projectDir.toString().replace("\\", "/"), files);
    }

    public record UploadedFile(String path, String content) {}
    public record UploadResult(String projectId, String root, List<FileInfo> files) {}
    public record FileInfo(String path, long size) {}
    public record ProjectGenerateResult(String chatId, String filePath, String documentation) {}
    public record ChatResult(String chatId, String documentation, List<String> versions, int versionIndex) {}
}
