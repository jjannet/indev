# INDEV - Company Management System

Full-stack web application built with **Go (Gin)** + **Angular 21** + **PostgreSQL**.

---

## Prerequisites

- **Go** 1.25+
- **Node.js** 22+ with Angular CLI (`npm i -g @angular/cli`)
- **PostgreSQL** (running on host machine)
- **Docker** + **Docker Compose** (for deployment)

---

## Project Structure

```
indev/
├── indv-api/                # Go backend (Gin + GORM)
│   ├── .env.example
│   ├── .env.development     # local dev (gitignored)
│   ├── .env.docker          # docker deploy (gitignored)
│   └── Dockerfile
├── indv-ui/                 # Angular frontend
│   ├── .env.example
│   ├── .env.development     # local dev (gitignored)
│   ├── .env.docker          # docker deploy (gitignored)
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## Getting Started (Local Dev)

### Database

Create a PostgreSQL database:

```sql
CREATE DATABASE indv_db;
```

### API

```bash
cd indv-api
cp .env.example .env.development
# Edit .env.development: set DB_USER, DB_PASSWORD, JWT_SECRET
# DB_HOST=localhost (default for local dev)
go run main.go
```

API starts on **http://localhost:2001**

### UI

```bash
cd indv-ui
cp .env.example .env.development
# Edit .env.development: API_URL=http://localhost:2001/api
npm install
ng serve
```

UI starts on **http://localhost:2002**

### Default Login

- **Email:** admin@indev.com
- **Password:** admin1234

---

## Deployment (Docker Local)

> PostgreSQL must be running on the **host machine** (not in Docker).
> Docker containers connect to it via `host.docker.internal`.

### First Time / After Changing Env

```bash
# API env
cd indv-api
cp .env.example .env.docker
# Edit .env.docker:
#   DB_HOST=host.docker.internal
#   CORS_ORIGINS=http://localhost:2502
#   JWT_SECRET=<your_secret>

# UI env
cd ../indv-ui
cp .env.example .env.docker
# Edit .env.docker:
#   API_URL=/api
```

### Build & Run

```bash
docker compose up -d --build
```

- **UI:** http://localhost:2502
- **API:** http://localhost:2051 (also proxied via nginx at /api)

### Stop

```bash
docker compose down
```

### Restart (Without Rebuild)

```bash
docker compose restart
```

### View Logs

```bash
docker compose logs -f           # all services
docker compose logs -f api       # api only
docker compose logs -f ui        # ui only
```

### Rebuild After Code Changes

```bash
docker compose up -d --build api   # rebuild api only
docker compose up -d --build ui    # rebuild ui only
docker compose up -d --build       # rebuild all
```

---

## Environment Variables

### API (indv-api/.env.*)

| Variable | Description | Dev | Docker |
|---|---|---|---|
| APP_PORT | API server port | 2001 | 2051 |
| CORS_ORIGINS | Allowed origins (comma-separated) | http://localhost:2002 | http://localhost:2502 |
| DB_HOST | PostgreSQL host | localhost | host.docker.internal |
| DB_PORT | PostgreSQL port | 5432 | 5432 |
| DB_NAME | Database name | indv_db | indv_db |
| DB_USER | Database user | - | - |
| DB_PASSWORD | Database password | - | - |
| JWT_SECRET | JWT signing secret | - | - |

### UI (indv-ui/.env.*)

| Variable | Description | Dev | Docker |
|---|---|---|---|
| API_URL | Backend API URL | http://localhost:2001/api | /api |

---

## Architecture (Docker)

```
Browser --> nginx (UI :2502) --> Go API (:2051) --> PostgreSQL (:5432 host)
                |                      |
                |  static files        |  host.docker.internal
                |  /api proxy          |
```

- **UI container**: nginx serves Angular static files + proxies /api to API container
- **API container**: Go binary, connects to PostgreSQL on host via host.docker.internal
- **No DB container**: PostgreSQL runs natively on host machine
