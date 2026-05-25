package com.localdoc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = { DataSourceAutoConfiguration.class })
public class LocalCoderApplication {
    public static void main(String[] args) {
        SpringApplication.run(LocalCoderApplication.class, args);
    }
}