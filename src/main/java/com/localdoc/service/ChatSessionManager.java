package com.localdoc.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localdoc.entity.ChatEntity;
import com.localdoc.entity.MessageEntity;
import com.localdoc.entity.ProjectEntity;
import com.localdoc.exception.InvalidRequestException;
import com.localdoc.repository.ChatSessionRepository;
import com.localdoc.repository.MessageRepository;
import com.localdoc.repository.ProjectFileRepository;
import com.localdoc.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatSessionManager {
    private final ChatSessionRepository chatSessionRepository;
    private final MessageRepository messageRepository;
    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ChatEntity createChat(String name, String mode) {
        ChatEntity chat = new ChatEntity();
        chat.setName(name != null && !name.isBlank() ? name : "Новый чат");
        chat.setMode(mode != null && !mode.isBlank() ? mode : "simple");
        return chatSessionRepository.save(chat);
    }

    @Transactional
    public void deleteChat(UUID chatId) {
        ChatEntity chat = chatSessionRepository.findById(chatId)
                .orElseThrow(() -> new InvalidRequestException("Чат не найден: " + chatId));
        ProjectEntity project = chat.getProject();
        chatSessionRepository.delete(chat);
        if (project != null) {
            projectFileRepository.deleteByProjectId(project.getId());
            projectRepository.delete(project);
        }
    }

    public List<ChatEntity> listChats() {
        return chatSessionRepository.findAll();
    }

    @Transactional
    public void updateChatState(UUID chatId, String frontendState) {
        ChatEntity chat = chatSessionRepository.findById(chatId)
                .orElseThrow(() -> new InvalidRequestException("Чат не найден: " + chatId));
        chat.setFrontendState(frontendState);
        syncProjectFromState(chat, frontendState);
        chatSessionRepository.save(chat);
    }

    private void syncProjectFromState(ChatEntity chat, String frontendState) {
        try {
            var node = objectMapper.readTree(frontendState);
            var pid = node.get("projectId");
            if (pid != null && !pid.asText().isBlank()) {
                UUID projectId = UUID.fromString(pid.asText());
                ProjectEntity project = projectRepository.findById(projectId).orElse(null);
                chat.setProject(project);
            } else {
                chat.setProject(null);
            }
        } catch (Exception e) {
            log.warn("Не удалось синхронизировать project из frontendState: {}", e.getMessage());
        }
    }

    @Transactional
    public void renameChat(UUID chatId, String newName) {
        ChatEntity chat = chatSessionRepository.findById(chatId)
                .orElseThrow(() -> new InvalidRequestException("Чат не найден: " + chatId));
        chat.setName(newName);
        chatSessionRepository.save(chat);
    }

    @Transactional
    public void updateTemplateCode(UUID chatId, String templateCode) {
        ChatEntity chat = chatSessionRepository.findById(chatId)
                .orElseThrow(() -> new InvalidRequestException("Чат не найден: " + chatId));
        chat.setTemplateCode(templateCode);
        chatSessionRepository.save(chat);
    }

    public ChatEntity getChat(UUID chatId) {
        return chatSessionRepository.findById(chatId)
                .orElseThrow(() -> new InvalidRequestException("Чат не найден: " + chatId));
    }

    @Transactional
    public void addMessage(UUID chatId, Message message) {
        ChatEntity chat = getChat(chatId);
        String role = message instanceof AssistantMessage ? "assistant" : "user";
        MessageEntity entity = new MessageEntity();
        entity.setRole(role);
        entity.setContent(message.getContent());
        entity.setChat(chat);
        messageRepository.save(entity);
    }

    public List<Message> getMessages(UUID chatId) {
        return messageRepository.findByChatIdOrderByCreatedAtAsc(chatId).stream()
                .map(e -> {
                    if ("assistant".equals(e.getRole())) {
                        return new AssistantMessage(e.getContent());
                    }
                    return new org.springframework.ai.chat.messages.UserMessage(e.getContent());
                })
                .collect(Collectors.toList());
    }

    public List<String> getAssistantMessages(UUID chatId) {
        return messageRepository.findByChatIdOrderByCreatedAtAsc(chatId).stream()
                .filter(e -> "assistant".equals(e.getRole()))
                .map(MessageEntity::getContent)
                .collect(Collectors.toList());
    }
}
