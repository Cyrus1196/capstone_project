#!/usr/bin/env bash
set -euo pipefail

cd /app

# Railway injects env vars — there is no committed .env. Create an empty one so
# artisan commands that touch the file do not crash.
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
  else
    touch .env
  fi
fi

# Parse mysql://user:pass@host:port/db into DB_* (Railway often provides DATABASE_URL / MYSQL_URL)
parse_mysql_url() {
  local url="$1"
  [[ -z "$url" ]] && return 0
  # strip mysql:// or mysql2://
  local rest="${url#mysql://}"
  rest="${rest#mysql2://}"
  local creds="${rest%%@*}"
  local hostpart="${rest#*@}"
  local user="${creds%%:*}"
  local pass="${creds#*:}"
  local hostport="${hostpart%%/*}"
  local db="${hostpart#*/}"
  db="${db%%\?*}"
  local host="${hostport%%:*}"
  local port="${hostport##*:}"
  [[ "$host" == "$port" ]] && port="3306"
  export DB_USERNAME="${DB_USERNAME:-$user}"
  export DB_PASSWORD="${DB_PASSWORD:-$pass}"
  export DB_HOST="${DB_HOST:-$host}"
  export DB_PORT="${DB_PORT:-$port}"
  export DB_DATABASE="${DB_DATABASE:-$db}"
}

# Railway MySQL plugin often injects MYSQL*; Laravel expects DB_*
export DB_CONNECTION="${DB_CONNECTION:-mysql}"
export DB_HOST="${DB_HOST:-${MYSQLHOST:-${MYSQL_HOST:-}}}"
export DB_PORT="${DB_PORT:-${MYSQLPORT:-${MYSQL_PORT:-3306}}}"
export DB_DATABASE="${DB_DATABASE:-${MYSQLDATABASE:-${MYSQL_DATABASE:-${MYSQL_DB:-}}}}"
export DB_USERNAME="${DB_USERNAME:-${MYSQLUSER:-${MYSQL_USER:-}}}"
export DB_PASSWORD="${DB_PASSWORD:-${MYSQLPASSWORD:-${MYSQL_PASSWORD:-}}}"

if [[ -z "${DB_HOST:-}" ]]; then
  parse_mysql_url "${DATABASE_URL:-}"
fi
if [[ -z "${DB_HOST:-}" ]]; then
  parse_mysql_url "${MYSQL_URL:-}"
fi
if [[ -z "${DB_HOST:-}" ]]; then
  parse_mysql_url "${MYSQL_PRIVATE_URL:-}"
fi

# Ensure writable runtime dirs
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache || true

# Clear stale caches when env changes on Railway
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Missing APP_KEY causes 500 on every request. Prefer a value set in Railway
# Variables; otherwise generate an ephemeral key in-memory (no file write).
if [[ -z "${APP_KEY:-}" ]]; then
  echo "WARN: APP_KEY was empty — generating ephemeral key. Set APP_KEY in Railway Variables."
  export APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
fi

# Without DB, database sessions/cache crash the homepage with empty Host.
if [[ -z "${DB_HOST:-}" || -z "${DB_DATABASE:-}" ]]; then
  echo "WARN: DB_HOST/DB_DATABASE empty — using file sessions. Link MySQL vars on this service."
  export SESSION_DRIVER=file
  export CACHE_STORE=file
  export QUEUE_CONNECTION=sync
else
  export SESSION_DRIVER="${SESSION_DRIVER:-database}"
  export CACHE_STORE="${CACHE_STORE:-database}"
  export QUEUE_CONNECTION="${QUEUE_CONNECTION:-database}"
fi

# Optional: run migrations on boot (set RUN_MIGRATIONS=true in Railway).
# Do NOT fail the whole container if tables already exist (common after SQL import).
if [[ "${RUN_MIGRATIONS:-false}" == "true" && -n "${DB_HOST:-}" ]]; then
  if ! php artisan migrate --force; then
    echo "WARN: migrate failed (e.g. table already exists). Set RUN_MIGRATIONS=false if you imported a SQL dump."
  fi
fi

php artisan config:cache || true
php artisan route:cache || true

PORT="${PORT:-8000}"
echo "Starting Academic Evaluation System on 0.0.0.0:${PORT}"
echo "APP_URL=${APP_URL:-unset} DB_HOST=${DB_HOST:-unset} DB_DATABASE=${DB_DATABASE:-unset}"
exec php artisan serve --host=0.0.0.0 --port="${PORT}"
