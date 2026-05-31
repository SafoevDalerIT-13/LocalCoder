package com.localdoc.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TemplateEntity {
    @Id
    @Column(length = 50)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
