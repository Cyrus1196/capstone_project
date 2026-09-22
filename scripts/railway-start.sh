#!/usr/bin/env bash
set -euo pipefail

cd /app

# Railway MySQL plugin often injects MYSQL*; Laravel expects DB_*
export DB_CONNECTION="${DB_CONNECTION:-mysql}"
export DB_HOST="${DB_HOST:-${MYSQLHOST:-${MYSQL_HOST:-}}}"
export DB_PORT="${DB_PORT:-${MYSQLPORT:-${MYSQL_PORT:-3306}}}"
export DB_DATABASE="${DB_DATABASE:-${MYSQLDATABASE:-${MYSQL_DATABASE:-}}}"
export DB_USERNAME="${DB_USERNAME:-${MYSQLUSER:-${MYSQL_USER:-}}}"
export DB_PASSWORD="${DB_PASSWORD:-${MYSQLPASSWORD:-${MYSQL_PASSWORD:-}}}"

# Ensure writable runtime dirs
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache || true

# Clear stale caches when env changes on Railway
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Missing APP_KEY causes 500 on every request (EncryptCookies / CookieJar)
if [[ -z "${APP_KEY:-}" ]]; then
  echo "WARN: APP_KEY was empty — generating one for this deploy."
  php artisan key:generate --force --no-interaction
fi

# Optional: run migrations on boot (set RUN_MIGRATIONS=true in Railway)
if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
  php artisan migrate --force
fi

php artisan config:cache || true
php artisan route:cache || true

PORT="${PORT:-8000}"
echo "Starting Academic Evaluation System on 0.0.0.0:${PORT}"
echo "APP_URL=${APP_URL:-unset} DB_HOST=${DB_HOST:-unset} DB_DATABASE=${DB_DATABASE:-unset}"
exec php artisan serve --host=0.0.0.0 --port="${PORT}"
