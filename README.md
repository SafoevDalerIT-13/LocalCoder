# Local Docs Generator

**Локальный сервис генерации технической документации** в формате Confluence Storage Format (XHTML) через LLM.

Работает полностью офлайн — всё на локальной машине через Ollama. NDA-friendly, интернет не требуется.

---

## Возможности

- **Генерация документации** — анализирует исходный код и формирует структурированную XHTML-документацию
- **2 формата** — 211 (вход/выход/ошибки) и 230 (архитектура/алгоритм)
- **Корректировка** — после генерации можно поправить конкретные разделы через чат
- **Версионирование** — каждая генерация/коррекция создаёт версию, можно переключаться
- **Проектный режим** — загрузите папку, выберите файлы и фрагменты кода, сгенерируйте документацию
- **Экспорт** — HTML, PDF, DOCX, Markdown
- **Drag-and-drop** — перетащите файлы в поля ввода кода и контекста
- **Тёмная / светлая тема**
- **i18n** — русский / английский интерфейс
- **Sidebar с чатами** — закрепление, переименование, удаление с подтверждением
- **Отмена генерации** — stop-кнопка прерывает запрос к LLM
- **Модальные окна** — с анимацией открытия/закрытия

---

## Стек

| Компонент | Технология |
|-----------|------------|
| **Язык** | Java 17 |
| **Фреймворк** | Spring Boot 3.3.5, Spring AI 1.0.0-M5 |
| **База данных** | PostgreSQL 16 |
| **ORM** | Spring Data JPA / Hibernate |
| **Фронтенд** | React 18 (основной) + Vanilla JS (static/) |
| **Стили** | CSS3 (CSS-переменные для темы) |
| **Иконки** | Material Symbols |
| **LLM** | Ollama (qwen2.5-coder, deepseek-coder и др.) |
| **Контейнеризация** | Docker, Docker Compose |
| **Swagger** | SpringDoc OpenAPI 2.6.0 |
| **Сборка** | Maven 3.9+ |

---

## Быстрый старт

### Требования

- **Docker** и **Docker Compose** (рекомендуется)
- Или **Java 17+**, **Maven 3.9+**, **Ollama** на хосте, **PostgreSQL 16**

### 1. Docker Compose (рекомендуется)

```bash
docker compose up -d
```

Запускает PostgreSQL 16 и приложение. Ollama предполагается на хосте (`host.docker.internal:11434`).

**Веб-интерфейс:** http://localhost:8080  
**Swagger UI:** http://localhost:8080/swagger-ui/index.html

### 2. Локальный запуск

```bash
# PostgreSQL
docker compose up -d postgres

# Сборка
mvn clean package -DskipTests

# Убедитесь, что Ollama запущен
ollama pull qwen2.5-coder:3b

# Запуск
mvn spring-boot:run
# или
java -jar target/local-docs-generator-0.0.1-SNAPSHOT.jar
```

---

## Конфигурация

### Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `OLLAMA_URL` | `http://localhost:11434` | Адрес Ollama |
| `OLLAMA_MODEL` | `qwen2.5-coder:3b` | Модель для генерации |
| `DB_URL` | `jdbc:postgresql://localhost:5432/localcoder` | JDBC URL PostgreSQL |
| `DB_USERNAME` | `localcoder` | Пользователь БД |
| `DB_PASSWORD` | `localcoder` | Пароль БД |

### Профили Spring Boot

| Профиль | Файл | Назначение |
|---------|------|------------|
| (default) | `application.yml` | PostgreSQL (локально или Docker) |
| `local` | `application-local.yml` | Локальная разработка (PostgreSQL) |
| `docker` | `application-docker.yml` | Docker-окружение |

### Рекомендуемые LLM-модели

| Модель | Размер | ОЗУ | Скорость | Качество |
|--------|--------|-----|----------|----------|
| `qwen2.5-coder:3b` | 1.8 ГБ | ~2.5 ГБ | Быстро | Среднее |
| `qwen2.5-coder:7b` | 4.5 ГБ | ~6 ГБ | Средне | Хорошее |
| `deepseek-coder-v2:16b` | 9.2 ГБ | ~10 ГБ | Медленно | Высокое |

Модель меняется через `OLLAMA_MODEL` в `docker-compose.yml` или переменную окружения.

---

## API endpoints

### Чаты

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/docs/chat` | Создать чат |
| `DELETE` | `/api/docs/chat/{id}` | Удалить чат (каскадно — сообщения + проект) |
| `PUT` | `/api/docs/chat/{id}/rename` | Переименовать чат |
| `PUT` | `/api/docs/chat/{id}/state` | Сохранить frontendState (пин, sourceCode, projectId и т.д.) |
| `GET` | `/api/docs/chats` | Список всех чатов |
| `GET` | `/api/docs/chat/{id}/versions` | Список версий документа |
| `GET` | `/api/docs/chat/{id}/version/{n}` | Конкретная версия |

### Генерация

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/docs/generate` | Сгенерировать документацию |
| `POST` | `/api/docs/correct` | Исправить существующую |
| `POST` | `/api/docs/generate/cancel/{chatId}` | Отменить генерацию |

### Проекты

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/docs/project/upload` | Загрузить проект (файлы хранятся в БД) |
| `POST` | `/api/docs/project/scan` | Сканировать директорию на диске |
| `GET` | `/api/docs/project/{id}` | Получить проект с файлами |
| `DELETE` | `/api/docs/project/{id}` | Удалить проект |
| `GET` | `/api/docs/project/read` | Прочитать содержимое файла из проекта |
| `POST` | `/api/docs/project/preview-prompt` | Предпросмотр промта |
| `POST` | `/api/docs/project/generate-from-selections` | Генерация по выбранным фрагментам |

### Экспорт

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/docs/export/{chatId}/{versionIndex}?format=html` | Экспорт (html/pdf/docx/md) |
| `GET` | `/api/docs/templates` | Список шаблонов |

---

## Структура проекта

```
├── src/main/java/com/localdoc/
│   ├── LocalCoderApplication.java
│   ├── config/                     # Spring-конфигурация, OpenAPI
│   ├── controller/                 # REST-контроллеры
│   ├── dto/                        # DTO (request/response)
│   ├── entity/                     # JPA-сущности (Chat, Message, Project, ProjectFile, Template)
│   ├── exception/                  # Обработка ошибок
│   ├── model/docstructure/         # Модели структуры документа (211, 230)
│   ├── repository/                 # Spring Data JPA репозитории
│   └── service/                    # Бизнес-логика
├── src/main/resources/
│   ├── application.yml             # Конфигурация по умолчанию (PostgreSQL)
│   ├── application-local.yml       # Локальная разработка
│   ├── application-docker.yml      # Docker-окружение
│   └── static/                     # Vanilla JS-фронтенд (альтернатива React)
├── docker-compose.yml              # PostgreSQL + опционально приложение
├── Dockerfile
└── pom.xml
```

Фронтенд на React находится в отдельном репозитории.

---

## Разработка

```bash
# PostgreSQL
docker compose up -d postgres

# Сборка
mvn clean package -DskipTests

# Запуск в dev-режиме
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Линтер (проверка кода)
mvn checkstyle:check
```

---

## Шаблоны документации

| Код | Назначение | Разделы |
|-----|-----------|---------|
| **211** | Метод + DTO | Входные данные (с развёрнутыми DTO), выходные данные, ошибки |
| **230** | Архитектура / алгоритм | Общие сведения, алгоритм по методам, последовательность вызовов |

Шаблоны задаются в YAML-конфигурации (`docs.templates`) и при старте загружаются в БД.

---

## Лицензия

MIT
