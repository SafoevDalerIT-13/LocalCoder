package com.localdoc.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentationResponse {
    private String documentation;
    private String templateCode;
    private String sessionId;
    private int versionIndex;
    private List<String> versions;
    private String algorithmCode;
    private String authorities;
    private String slaP95;
    private String slaP99;
}
