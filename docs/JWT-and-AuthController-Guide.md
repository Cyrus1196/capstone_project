# Capstone Project — JWT & AuthController Guide

**System:** Capstone Registry / Evaluation Platform  
**Audience:** Developers, evaluators, documentation readers  
**Last updated:** August 2026

---

## 1. What is JWT? (Simple explanation)

JWT means **JSON Web Token**.

Think of it like a **theme-park wristband**:

1. You show your ID once at the gate (email + password).
2. The office gives you a wristband (the JWT).
3. For every ride (API request), you show the wristband — not your password again.
4. Guards check: Is the wristband real? Is it still valid?

A JWT is a long string with **three parts** separated by dots:

```text
header.payload.signature
```

| Part | Meaning |
|------|---------|
| Header | What kind of token / signing style |
| Payload | Who you are (`user_id`, email, role) and when it expires |
| Signature | Secret stamp from the server (`JWT_SECRET`) so nobody can fake it |

---

## 2. How JWT works in this system

### Big picture flow

```text
React Frontend                         Laravel Backend
      |                                        |
      |  1. POST /api/login                    |
      |     { email, password }                |
      | -------------------------------------> |
      |                                        | AuthController checks user
      |                                        | Creates JWT
      |  2. { access_token, user, ... }        |
      | <------------------------------------- |
      |                                        |
      |  Saves jwt_token in localStorage       |
      |                                        |
      |  3. Later API calls add:               |
      |     Authorization: Bearer <token>      |
      | -------------------------------------> |
      |                                        | auth:api guard validates JWT
      |  4. Protected data / success           |
      | <------------------------------------- |
```

### Where the token lives

| Place | Role |
|-------|------|
| Backend response `access_token` | JWT created after successful login |
| Browser `localStorage` key `jwt_token` | Frontend stores the badge |
| Request header `Authorization: Bearer ...` | Sent on every protected API call |
| `.env` → `JWT_SECRET` | Secret used to stamp / verify tokens |
| `.env` → `JWT_TTL` | Lifetime in minutes (default **60**) |

### Important frontend files

- `front-end/src/api/axios.js` — attaches Bearer token; refreshes on 401
- `front-end/src/services/jwtAuthService.js` — login / logout / refresh helpers
- `front-end/src/context/AuthContext.js` — stores logged-in user for the UI

### Important backend files

- `backend-app/app/Http/Controllers/AuthController.php` — **main login** for the app
- `backend-app/app/Http/Controllers/JwtAuthController.php` — register, refresh, alternate JWT API
- `backend-app/app/Services/AuthSecurity.php` — password checks, lockout
- `backend-app/app/Services/AuthUnitHelpers.php` — email/password/token helpers (Level 1 tests)
- `backend-app/app/Models/TblUser.php` — implements `JWTSubject` (what goes inside the token)
- `backend-app/routes/api.php` — public vs `auth:api` protected routes
- `backend-app/config/jwt.php` — JWT package settings

---

## 3. AuthController — how it works

`AuthController` is the **main authentication door** used by the React portal.

### Routes (typical)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/login` | Log in, return JWT + full user payload |
| POST | `/api/logout` | Invalidate token / log out |
| GET | `/api/user` | Return current user (needs valid JWT) |

### Login steps (`AuthController::login`)

1. **Validate input** — email required + format check; password required
2. **Find user** in `tbl_users` by email — if missing, failed login log
3. **Security check** via `AuthSecurity::validateCredentialsForLogin`
   - Account locked?
   - Password match? (`verifyPasswordMatch` / bcrypt)
   - Account active?
4. **Create JWT** for that `user_id`
5. **Log successful login** (`UserSessionLogger`)
6. **Return JSON** including:
   - `access_token` (JWT)
   - `token_type`: `Bearer`
   - `expires_in` (seconds)
   - `user` — rich payload (role, department, program, permissions, etc.)
   - `security` — session timeout settings for the UI
   - `message`: Login successful

### Why the rich `user` payload matters

`AuthController::userPayload()` builds what the frontend needs to:

- Know the role (Admin, Dean, Faculty, Student, …)
- Show the correct panel
- Enforce permissions in the UI
- Apply evaluation year-level restrictions

### Logout (`AuthController::logout`)

1. Read current JWT
2. Log the logout event
3. Invalidate / blacklist the token
4. Frontend also deletes `jwt_token` from `localStorage`

---

## 4. AuthController vs JwtAuthController

Both use JWT. They are **not** “session vs token.”

| | AuthController | JwtAuthController |
|--|----------------|-------------------|
| Role | Main app login | Extra JWT tools |
| Primary login URL | `POST /api/login` | `POST /api/jwt/login` |
| Used by React login UI | **Yes** | Mostly helpers |
| Register | No | `POST /api/jwt/register` |
| Refresh expired token | No | `POST /api/jwt/refresh` |
| User data returned | Full portal payload | Thin (`id`, `email`, `role_id`) |

**Kid version:**  
AuthController = school office that gives you a badge **and** your full student/staff record.  
JwtAuthController = machine that can also make/refresh badges and register users.

Axios uses **JwtAuthController refresh** when a protected call returns **401**.

---

## 5. Protected routes

In `routes/api.php`:

- **Public:** login, some guest/curriculum browse, JWT register/refresh
- **Protected:** almost everything else inside `middleware('auth:api')`

`auth:api` means: only continue if the Bearer JWT is valid.

---

## 6. Token expiry & refresh

1. JWT expires after `JWT_TTL` minutes (default 60).
2. If an API call gets **401**, axios tries `POST /api/jwt/refresh` once.
3. If refresh works → save new token, retry the request.
4. If refresh fails → remove token, redirect to `/login`.

Idle logout (session timeout from security settings) is separate from JWT expiry.

---

## 7. Security pieces tied to auth

| Piece | Purpose |
|-------|---------|
| Bcrypt password hash | Passwords never stored as plain text |
| Lockout after failed attempts | Stops password guessing |
| JWT signature (`JWT_SECRET`) | Stops forged tokens |
| Token blacklist on logout | Old badge cannot be reused |
| Level 1 helpers (UT-101…106) | Email/password/token unit checks |

---

## 8. Quick FAQ

**Q: Does AuthController use JWT?**  
A: Yes. Login returns an `access_token` JWT.

**Q: Why are there two auth controllers?**  
A: One is the main portal login; the other adds register/refresh and a thinner JWT API.

**Q: Where is the token saved?**  
A: In the browser: `localStorage.jwt_token`.

**Q: Do I send the password on every request?**  
A: No. Only at login. Later requests send the JWT.

**Q: What happens if someone steals my JWT?**  
A: They can act as you until it expires or is blacklisted. That is why HTTPS, short TTL, logout, and idle timeout matter.

---

## 9. Summary

1. User logs in through **AuthController** (`POST /api/login`).
2. Backend verifies password and issues a **JWT**.
3. Frontend stores it as **`jwt_token`**.
4. Every protected API call sends **`Authorization: Bearer <token>`**.
5. Laravel `auth:api` validates the token and loads the user.
6. Logout / expiry / failed refresh removes access.

**JWT = temporary signed pass.**  
**AuthController = main door that issues that pass and the full user profile for the portal.**
