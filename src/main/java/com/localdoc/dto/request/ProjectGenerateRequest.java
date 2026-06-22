package com.localdoc.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectGenerateRequest {
    private String projectId;
    private List<CodeSelection> selections;
    private String templateCode;
    private String algorithmCode;
    private String algorithmDescription;
    private String algorithmLink;
    private String authorities;
    private String slaP95;
    private String slaP99;
}
