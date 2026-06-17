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
public class Document211 {
    private String methodName;
    private String description;
    private String algorithmCode;
    private String authorities;
    private String slaP95;
    private String slaP99;
    private List<FieldInfo> inputParams;
    private List<FieldInfo> outputParams;
    private List<ErrorInfo> errors;
}
