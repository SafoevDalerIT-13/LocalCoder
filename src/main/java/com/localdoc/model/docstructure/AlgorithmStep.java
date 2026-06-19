package com.localdoc.model.docstructure;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlgorithmStep {
    private String number;
    private String action;
    private String note;
    private String as;
}
