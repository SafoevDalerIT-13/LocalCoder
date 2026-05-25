package com.localdoc.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentationResponse {
    private String documentation;
    private String templateCode;
    private boolean success;
    private String errorMessage;
}