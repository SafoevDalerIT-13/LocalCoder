package com.localdoc.controller;

import com.localdoc.dto.request.DocumentationRequest;
import com.localdoc.dto.response.DocumentationResponse;
import com.localdoc.service.DocumentationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docs")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE,makeFinal = true)
public class DocumentationController {
    DocumentationService docService;

    @PostMapping("/generate")
    public ResponseEntity<DocumentationResponse> generate(@RequestBody DocumentationRequest request) {
        String documentation = docService.generateDocumentation(
                request.getSourceCode(),
                request.getTemplateCode()
        );
        DocumentationResponse response = new DocumentationResponse(documentation, request.getTemplateCode());
        return ResponseEntity.ok(response);
    }
}
