package com.localdoc.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentationRequest {
    private UUID chatId;
    private String sourceCode;
    private String templateCode;
    private String name;
    private String algorithmCode;
    private String algorithmLink;
    private String authorities;
    private String slaP95;
    private String slaP99;
}
