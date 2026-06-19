package com.localdoc.model.docstructure;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document230 {
    private String methodName;
    private String description;
    private String algorithmCode;
    private String algorithmDescription;
    private String algorithmLink;
    private String authorities;
    private String inputParamsDescription;
    private String outputParamsDescription;
    private String expectedResult;
    private List<AlgorithmStep> steps;
}
