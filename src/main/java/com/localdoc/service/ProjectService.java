package com.localdoc.service;

import com.localdoc.dto.request.CodeSelection;
import com.localdoc.entity.ChatEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ChatSessionManager sessionManager;
    private final DocumentationService documentationService;

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

    public String readFileContent(String filePath) throws IOException {
        Path path = Paths.get(filePath).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new IllegalArgumentException("Файл не найден: " + filePath);
        }
        return Files.readString(path);
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

    public String buildPromptFromSelections(String projectId, List<CodeSelection> selections) throws IOException {
        Path projectDir = Path.of("./uploaded", projectId).toAbsolutePath().normalize();
        if (!Files.isDirectory(projectDir)) {
            throw new IllegalArgumentException("Проект не найден: " + projectId);
        }

        StringBuilder prompt = new StringBuilder();

        for (CodeSelection sel : selections) {
            appendSelection(prompt, projectDir, sel);
        }

        return prompt.toString();
    }

    private void appendSelection(StringBuilder sb, Path projectDir, CodeSelection sel) throws IOException {
        Path file = projectDir.resolve(sel.getFilePath()).normalize();
        if (!file.startsWith(projectDir) || !Files.isRegularFile(file)) {
            log.warn("Файл не найден: {}", sel.getFilePath());
            return;
        }

        List<String> allLines = Files.readAllLines(file);
        int start = Math.max(1, sel.getLineStart());
        int end = Math.min(allLines.size(), sel.getLineEnd());
        if (start > end) return;

        String label = sel.isMain() ? "ГЛАВНЫЙ" : "КОНТЕКСТ";
        sb.append("// === [").append(label).append("] ")
                .append(sel.getFilePath()).append(" (строки ").append(start).append("-").append(end).append(") ===\n");

        for (int i = start - 1; i < end; i++) {
            sb.append(allLines.get(i)).append("\n");
        }
        sb.append("\n");
    }

    public ChatResult generateFromSelections(String projectId, List<CodeSelection> selections,
                                              String templateCode,
                                              String algorithmCode, String algorithmDescription, String algorithmLink,
                                              String authorities, String slaP95, String slaP99) throws IOException {
        String promptText = buildPromptFromSelections(projectId, selections);
        if (promptText.isBlank()) {
            throw new IllegalArgumentException("Не удалось собрать промт из выбранных кусков кода");
        }

        String mainFileName = selections.stream()
                .filter(CodeSelection::isMain)
                .findFirst()
                .map(s -> s.getFilePath().contains("/") ? s.getFilePath().substring(s.getFilePath().lastIndexOf('/') + 1) : s.getFilePath())
                .orElse("project");

        ChatEntity chat = sessionManager.createChat(mainFileName, "project");
        UUID chatId = chat.getId();
        sessionManager.addMessage(chatId, new UserMessage(promptText));

        String doc = documentationService.generateDocumentation(chatId, promptText,
                templateCode != null ? templateCode : "230",
                algorithmCode, algorithmDescription, algorithmLink,
                authorities, slaP95, slaP99);

        if (doc != null) {
            sessionManager.addMessage(chatId, new AssistantMessage(doc));
        }

        List<String> versions = sessionManager.getAssistantMessages(chatId);
        return new ChatResult(chatId.toString(), doc, versions, versions.size() - 1);
    }

    public record UploadedFile(String path, String content) {}
    public record UploadResult(String projectId, String root, List<FileInfo> files) {}
    public record FileInfo(String path, long size) {}
    public record ChatResult(String chatId, String documentation, List<String> versions, int versionIndex) {}
}
