package com.localdoc.service;

import com.localdoc.exception.InvalidRequestException;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatSessionManager {
    private final Map<String, SessionEntry> sessions = new ConcurrentHashMap<>();

    public String createSession(String sourceCode, String templateCode) {
        String sessionId = UUID.randomUUID().toString();
        List<Message> messages = new ArrayList<>();
        SessionEntry entry = new SessionEntry(sourceCode, templateCode, messages);
        sessions.put(sessionId, entry);
        return sessionId;
    }

    public SessionEntry getSession(String sessionId) {
        SessionEntry entry = sessions.get(sessionId);
        if (entry == null) {
            throw new InvalidRequestException("Сессия не найдена: " + sessionId);
        }
        return entry;
    }

    public void addMessage(String sessionId, Message message) {
        SessionEntry entry = getSession(sessionId);
        entry.messages.add(message);
    }

    @Getter
    @AllArgsConstructor
    public static class SessionEntry {
        private final String sourceCode;
        private final String templateCode;
        private final List<Message> messages;
    }
}
