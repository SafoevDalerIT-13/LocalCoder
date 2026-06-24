package com.localdoc.service;

import com.localdoc.dto.request.CodeSelection;
import com.localdoc.entity.ChatEntity;
import com.localdoc.entity.ProjectEntity;
import com.localdoc.entity.ProjectFileEntity;
import com.localdoc.exception.InvalidRequestException;
import com.localdoc.repository.ProjectFileRepository;
import com.localdoc.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
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

    @Transactional
    public UploadResult uploadProject(String projectName, List<UploadedFile> uploadedFiles) throws IOException {
        ProjectEntity project = new ProjectEntity();
        project.setName(projectName != null && !projectName.isBlank() ? projectName : "project");
        project.setProjectPath(null);
        project = projectRepository.save(project);

        for (UploadedFile f : uploadedFiles) {
            ProjectFileEntity fileEntity = new ProjectFileEntity();
            fileEntity.setProject(project);
            fileEntity.setRelativePath(f.path());
            String fileName = f.path().contains("/") ? f.path().substring(f.path().lastIndexOf('/') + 1) : f.path();
            fileEntity.setFileName(fileName);
            String sanitized = f.content() != null ? f.content().replace("\u0000", "") : "";
            fileEntity.setContent(sanitized);
            projectFileRepository.save(fileEntity);
        }

        List<FileInfo> files = projectFileRepository.findByProjectIdOrderByRelativePath(project.getId()).stream()
                .map(f -> new FileInfo(f.getRelativePath(), f.getContent() != null ? (long) f.getContent().length() : 0L))
                .toList();

        return new UploadResult(project.getId().toString(), project.getName(), files);
    }

    @Transactional(readOnly = true)
    public String readFileContent(UUID projectId, String relativePath) throws IOException {
        ProjectFileEntity file = projectFileRepository.findByProjectIdAndRelativePath(projectId, relativePath);
        if (file == null) {
            throw new IllegalArgumentException("Файл не найден в проекте: " + relativePath);
        }
        return file.getContent();
    }

    @Transactional(readOnly = true)
    public String readFileContent(String projectId, String relativePath) throws IOException {
        return readFileContent(UUID.fromString(projectId), relativePath);
    }

    @Transactional(readOnly = true)
    public String readFileById(UUID fileId) {
        ProjectFileEntity file = projectFileRepository.findById(fileId)
                .orElseThrow(() -> new InvalidRequestException("Файл не найден: " + fileId));
        return file.getContent();
    }

    @Transactional(readOnly = true)
    public ProjectResult getProject(UUID projectId) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new InvalidRequestException("Проект не найден: " + projectId));
        List<FileInfo> files = projectFileRepository.findByProjectIdOrderByRelativePath(projectId).stream()
                .map(f -> new FileInfo(f.getRelativePath(), f.getContent() != null ? (long) f.getContent().length() : 0L))
                .toList();
        return new ProjectResult(project.getId().toString(), project.getName(), project.getProjectPath(), files);
    }

    @Transactional
    public void deleteProject(UUID projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new InvalidRequestException("Проект не найден: " + projectId);
        }
        projectRepository.deleteById(projectId);
    }

    @Transactional(readOnly = true)
    public String buildPromptFromSelections(String projectId, List<CodeSelection> selections) throws IOException {
        UUID pid = UUID.fromString(projectId);
        StringBuilder prompt = new StringBuilder();

        for (CodeSelection sel : selections) {
            appendSelection(prompt, pid, sel);
        }

        return prompt.toString();
    }

    private void appendSelection(StringBuilder sb, UUID projectId, CodeSelection sel) throws IOException {
        ProjectFileEntity file = projectFileRepository.findByProjectIdAndRelativePath(projectId, sel.getFilePath());
        if (file == null) {
            log.warn("Файл не найден: {}", sel.getFilePath());
            return;
        }

        String content = file.getContent();
        if (content == null) return;

        String[] allLines = content.split("\n", -1);
        int start = Math.max(1, sel.getLineStart());
        int end = Math.min(allLines.length, sel.getLineEnd());
        if (start > end) return;

        String label = sel.isMain() ? "ГЛАВНЫЙ" : "КОНТЕКСТ";
        sb.append("// === [").append(label).append("] ")
                .append(sel.getFilePath()).append(" (строки ").append(start).append("-").append(end).append(") ===\n");

        for (int i = start - 1; i < end; i++) {
            sb.append(allLines[i]).append("\n");
        }
        sb.append("\n");
    }

    @Transactional
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
        sessionManager.addMessage(chatId, new org.springframework.ai.chat.messages.UserMessage(promptText));

        String doc = documentationService.generateDocumentation(chatId, promptText,
                templateCode != null ? templateCode : "230",
                algorithmCode, algorithmDescription, algorithmLink,
                authorities, slaP95, slaP99);

        if (doc != null) {
            sessionManager.addMessage(chatId, new org.springframework.ai.chat.messages.AssistantMessage(doc));
        }

        List<String> versions = sessionManager.getAssistantMessages(chatId);
        return new ChatResult(chatId.toString(), doc, versions, versions.size() - 1);
    }

    public record UploadedFile(String path, String content) {}
    public record UploadResult(String projectId, String root, List<FileInfo> files) {}
    public record FileInfo(String path, long size) {}
    public record ProjectResult(String projectId, String name, String projectPath, List<FileInfo> files) {}
    public record ChatResult(String chatId, String documentation, List<String> versions, int versionIndex) {}
}
