package com.localdoc.ai;

import com.localdoc.dto.request.DocumentationRequest;
import com.localdoc.dto.response.DocumentationResponse;
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
        try {
            String doc = docService.generateDocumentation(
                    request.getSourceCode(),
                    request.getTemplateCode()
            );
            DocumentationResponse response = new DocumentationResponse(
                    doc,
                    request.getTemplateCode(),
                    true,
                    null
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            DocumentationResponse errorResponse = new DocumentationResponse(
                    null,
                    request.getTemplateCode(),
                    false,
                    e.getMessage()
            );
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}
