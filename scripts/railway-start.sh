#!/usr/bin/env bash
set -euo pipefail

cd /app

# Ensure writable runtime dirs
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache || true

# Clear stale caches when env changes on Railway
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Optional: run migrations on boot (set RUN_MIGRATIONS=true in Railway)
if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
  php artisan migrate --force
fi

php artisan config:cache || true
php artisan route:cache || true

PORT="${PORT:-8000}"
echo "Starting Academic Evaluation System on 0.0.0.0:${PORT}"
exec php artisan serve --host=0.0.0.0 --port="${PORT}"
