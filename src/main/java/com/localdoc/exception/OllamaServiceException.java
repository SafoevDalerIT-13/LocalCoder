package com.localdoc.exception;

public class OllamaServiceException extends RuntimeException {
    public OllamaServiceException(String message, Throwable cause) {
        super(message, cause);
    }

    public OllamaServiceException(String message) {
        super(message);
    }
}