package com.localdoc.repository;

import com.localdoc.entity.ProjectFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectFileRepository extends JpaRepository<ProjectFileEntity, UUID> {

    List<ProjectFileEntity> findByProjectIdOrderByRelativePath(UUID projectId);

    ProjectFileEntity findByProjectIdAndRelativePath(UUID projectId, String relativePath);

    void deleteByProjectId(UUID projectId);
}
