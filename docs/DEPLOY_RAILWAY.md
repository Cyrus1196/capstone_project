# Deploy on Railway (frontend + backend together)

One Railway **web service** runs Laravel and serves the React build from `public/spa.html`.  
Add a **MySQL** plugin in the same project.

## 1. GitHub

This project must be on GitHub (Railway deploys from Git).

If the repo is empty or outdated, from `c:\capstone_project`:

```powershell
git init
git add .
git commit -m "Prepare combined Railway deploy (Laravel serves React)."
git branch -M main
git remote add origin https://github.com/Cyrus1196/capstone_project.git
git push -u origin main
```

(Use a branch if you prefer, e.g. `railway-deploy`.)

Do **not** commit `backend-app/.env` (already gitignored).

## 2. Railway project

1. Sign up at [https://railway.com](https://railway.com) (free trial ≈ $5 / 30 days).
2. **New Project** → **Deploy from GitHub** → select `capstone_project`.
3. Root directory = repo root (has `Dockerfile` + `railway.toml`).
4. **Add Plugin** → **MySQL**.

## 3. Variables (Web service)

Copy from MySQL plugin where noted. Set at least:

```env
APP_NAME=Academic Evaluation System
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:GENERATE_WITH_artisan_key_generate
APP_URL=https://YOUR-SERVICE.up.railway.app

LOG_CHANNEL=stderr

DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

FRONTEND_URL=https://YOUR-SERVICE.up.railway.app
CORS_ALLOWED_ORIGINS=https://YOUR-SERVICE.up.railway.app

# Brevo SMTP (same as local)
MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=your-brevo-login
MAIL_PASSWORD=your-smtp-key
MAIL_SCHEME=
MAIL_FROM_ADDRESS=your-verified@gmail.com
MAIL_FROM_NAME=Academic Evaluation System
MAIL_REQUIRE_VERIFIED=true

JWT_SECRET=your-jwt-secret
SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

RUN_MIGRATIONS=true
```

Generate `APP_KEY` locally:

```powershell
cd backend-app
php artisan key:generate --show
```

After first deploy, set `APP_URL` / `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` to the real Railway HTTPS URL.

## 4. Database data

Either:

- `RUN_MIGRATIONS=true` then seed/import, or  
- Import your SQL dump into Railway MySQL (TablePlus / MySQL client using Railway credentials).

For a testing DB without students, use  
`db_backups/capstone_db_testing_no_students_*.sql` (import via client; large dumps may need Railway shell).

## 5. Smoke test

Open `https://YOUR-SERVICE.up.railway.app`  
- UI loads (React)  
- Login works (`/api/login`)  
- `/up` returns ok  

## Local combined preview (optional)

```powershell
cd front-end
npm ci
npm run build
cd ..
# Git Bash / WSL:
bash scripts/sync-frontend-to-public.sh
cd backend-app
php artisan serve
```

Then open `http://127.0.0.1:8000` (UI + API same origin).

## Defense one-liner

> We host the Academic Evaluation System on Railway as a single deployment: React UI and Laravel API on one service, MySQL in the same project.
