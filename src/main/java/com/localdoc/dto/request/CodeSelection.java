package com.localdoc.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CodeSelection {
    private String filePath;
    private int lineStart;
    private int lineEnd;
    private boolean main;
}
