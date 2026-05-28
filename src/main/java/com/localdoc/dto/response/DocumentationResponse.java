package com.localdoc.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentationResponse {
    private String documentation;
    private String templateCode;
    private String sessionId;
}
