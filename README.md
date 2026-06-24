# link-cutter

Поднял прод на VPS в docker:
http://138.124.99.135:8004/

<img width="1075" height="875" alt="image" src="https://github.com/user-attachments/assets/e63935d4-03d7-4c1e-ad8c-0339176b4de8" />

test CI|CD - Работает!

Документация - http://138.124.99.135:8008/docs

<img width="1589" height="839" alt="image" src="https://github.com/user-attachments/assets/949522e0-eb60-4120-9db9-454e4b4a2ab8" />

Архитектура

```mermaid
flowchart TB
    subgraph Client["🖥️ Клиент"]
        Browser["🌐 Браузер"]
    end

    subgraph VPS["☁️ VPS (138.124.99.135)"]
        subgraph Docker["🐳 Docker Compose"]
            subgraph Services["Микросервисы"]
                LinkService["🔗 link_service<br>FastAPI :8001"]
                UserService["👤 user_service<br>FastAPI :8002"]
            end

            subgraph Frontend["Frontend"]
                UI["📄 HTML + CSS + JS<br> :8005"]
            end

            subgraph Database["🗄️ База данных"]
                PG["PostgreSQL 15<br>:5432"]
            end
        end
    end

    Browser -->|GET /| UI
    UI -->|API Call| LinkService
    UI -->|API Call| UserService
    LinkService -->|Проверка пользователя| UserService
    LinkService -->|CRUD| PG
    UserService -->|CRUD| PG

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef vps fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef docker fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef frontend fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef db fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class Browser client
    class VPS vps
    class Docker docker
    class UI frontend
    class LinkService,UserService service
    class PG db
