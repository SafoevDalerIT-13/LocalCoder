package com.localdoc.exception;

public class TemplateNotFoundException extends RuntimeException {
    private final String templateCode;

    public TemplateNotFoundException(String templateCode) {
        super("Шаблон с кодом '" + templateCode + "' не найден");
        this.templateCode = templateCode;
    }

    public String getTemplateCode() {
        return templateCode;
    }
}