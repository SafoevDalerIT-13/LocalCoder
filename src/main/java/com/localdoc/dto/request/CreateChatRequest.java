package com.localdoc.dto.request;

import lombok.Data;

@Data
public class CreateChatRequest {
    private String name;
    private String mode = "simple";
}
