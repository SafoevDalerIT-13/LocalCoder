package com.localdoc.service;

import com.localdoc.entity.ChatEntity;
import com.localdoc.entity.MessageEntity;
import com.localdoc.exception.InvalidRequestException;
import com.localdoc.repository.ChatSessionRepository;
import com.localdoc.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatSessionManager {
    private final ChatSessionRepository chatSessionRepository;
    private final MessageRepository messageRepository;

    @Transactional
    public ChatEntity createChat(String name, String mode) {
        ChatEntity chat = new ChatEntity();
        chat.setName(name != null && !name.isBlank() ? name : "Новый чат");
        chat.setMode(mode != null && !mode.isBlank() ? mode : "simple");
        return chatSessionRepository.save(chat);
    }

    @Transactional
    public void deleteChat(UUID chatId) {
        if (!chatSessionRepository.existsById(chatId)) {
            throw new InvalidRequestException("Чат не найден: " + chatId);
        }
        chatSessionRepository.deleteById(chatId);
    }

    public List<ChatEntity> listChats() {
        return chatSessionRepository.findAll();
    }

    @Transactional
    public void updateChatState(UUID chatId, String frontendState) {
        ChatEntity chat = chatSessionRepository.findById(chatId)
                .orElseThrow(() -> new InvalidRequestException("Чат не найден: " + chatId));
        chat.setFrontendState(frontendState);
        chatSessionRepository.save(chat);
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
