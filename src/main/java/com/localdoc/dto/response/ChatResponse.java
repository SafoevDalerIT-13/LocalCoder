package com.localdoc.dto.response;

import com.localdoc.entity.ChatEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private UUID id;
    private String name;
    private String mode;
    private String templateCode;
    private String frontendState;

    public static ChatResponse from(ChatEntity e) {
        return new ChatResponse(e.getId(), e.getName(), e.getMode(),
                e.getTemplateCode(), e.getFrontendState());
    }
}
