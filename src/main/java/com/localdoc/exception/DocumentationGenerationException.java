package com.localdoc.exception;

public class DocumentationGenerationException extends RuntimeException {
    public DocumentationGenerationException(String message, Throwable cause) {
        super(message, cause);
    }

    public DocumentationGenerationException(String message) {
        super(message);
    }
}