package com.localdoc.repository;

import com.localdoc.entity.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, UUID> {
    List<MessageEntity> findByChatIdOrderByCreatedAtAsc(UUID chatId);
    void deleteByChatId(UUID chatId);
}
