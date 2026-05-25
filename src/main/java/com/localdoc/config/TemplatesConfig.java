package com.localdoc.config;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@ConfigurationProperties(prefix = "docs")
@FieldDefaults(level = AccessLevel.PRIVATE)
@Getter
@Setter
public class TemplatesConfig {
    Map<String, String> templates;
}
