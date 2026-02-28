Parent Journal - Prototype

Paths:
- /data/dev/parent-journal - project root
- backend - FastAPI app
- frontend - Vite React app
- docker-compose.yml - runs backend+frontend

Quick start:
1. cd /data/dev/parent-journal
2. docker compose up -d --build
3. Open http://<host-ip>:30010 (frontend served via nginx) or backend API at http://<host-ip>:8000

Notes:
- Storage: uploads stored at /data/dev/parent-journal/data/uploads
- DB: SQLite at /data/dev/parent-journal/data/journal.db
- Default admin credentials will be created on first run (admin / password). Change after first login.
