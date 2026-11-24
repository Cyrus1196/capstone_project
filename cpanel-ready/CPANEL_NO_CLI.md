# cPanel deploy without CLI (school host `/saes`)

Instructor cannot run `npm` / `composer` on the server. Build on a student PC, then upload via File Manager.

**PHP:** set MultiPHP to **8.1** (app targets Laravel 10 / PHP ^8.1).

## Already done on server
1. Document root → `backend-app/public`
2. `.env` in `backend-app`
3. Writable `storage` / `bootstrap/cache`

## A) Frontend (no server CLI) — upload this zip
Use **`cpanel-saes-frontend.zip`** (built for `/saes`):

1. Extract locally.
2. File Manager → open `backend-app/public/`.
3. Upload and overwrite:
   - `spa.html`
   - `static/` (replace entire folder)
   - any other files from the zip root (favicon, manifest, etc.)
4. Rename/copy **`.htaccess.cpanel-saes`** → **`.htaccess`** (replace the old one).

## B) PHP packages (if site shows Composer / vendor errors)
If `backend-app/vendor` is missing on the server:

1. On a PC with PHP: inside `backend-app` run `composer install --no-dev`
2. Zip the `vendor` folder and upload into `backend-app/vendor/`

Or ask hosting to enable **Terminal** / Composer once.

## C) `.env` values for this URL
```env
APP_URL=https://coc-studentinfo.net/saes
FRONTEND_URL=https://coc-studentinfo.net/saes
DB_DATABASE=capstone_db_deploy
QUEUE_CONNECTION=database
```

Import `capstone_db_deploy.sql` in phpMyAdmin if not done yet.

## D) Queue worker
Shared cPanel often has **no** always-on `php artisan queue:work`. Large CSV import may stay pending unless hosting adds a worker/cron. Smaller imports may still advance via status polling.

## Test
Open: https://coc-studentinfo.net/saes/
