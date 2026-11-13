# Hôm nay ăn gì?

React + Vite frontend, Supabase email authentication, and Express API. This repository uses an existing Supabase database; it does not apply schema migrations.

## Requirements

- Node.js 22.12 or newer (Node.js 24 recommended)
- npm
- A Supabase project with the schema described below

## Configure environment

From the repository root, copy the example files.

PowerShell:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
Copy-Item backend\.env.example backend\.env
```

macOS, Linux, or Git Bash:

```sh
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Set the values in those local files:

- `frontend/.env.local`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (a legacy anon key is also supported).
- `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `FRONTEND_ORIGIN`. Keep the service-role key server-only; never put it in a `VITE_` variable.

The root `.gitignore` excludes local `.env` files while allowing the `.env.example` templates to be committed. Never put real credentials in the example files.

## Run locally

Start the backend in one terminal:

```sh
cd backend
npm ci
npm run dev
```

Start the frontend in a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to the backend at `http://localhost:3000`. If you change the backend port, update the proxy in `frontend/vite.config.js` as well. The frontend displays configuration and API errors rather than silently showing demo data.

## Supabase

The existing schema must expose:

- `mon_an(ma_mon, ten_mon, mo_ta_ngan, hinh_anh, trang_thai)`
- `nguoi_dung(ma_nd, ten_hien_thi, anh_dai_dien, vai_tro, trang_thai)`

Both tables use `ACTIVE` as the active status value. Verify these names and values against your database before running the app.

Keep email authentication enabled. In Supabase Auth URL Configuration, allow `http://localhost:5173` and your production frontend URL, and set the production Site URL. Registration sends `display_name` metadata; the existing profile trigger should use it to create a row in `nguoi_dung`. The API returns an explicit error if the profile is missing. The UI does not create profiles or assign account roles.

Optionally run `supabase/seed.sql` in the Supabase SQL Editor to add five sample dishes. Re-running it skips dishes with matching names. It does not create tables or change RLS policies. Application table reads go through Express; the browser uses Supabase directly for Auth only.

## Verify

1. Open http://localhost:3000/api/health. `databaseConfigured` should be `true`; this confirms configuration is present, not that the database is reachable.
2. Register, follow the confirmation email if enabled, and sign in. Your display name and account status should appear.
3. Refresh the page to verify session restoration, then sign out.
4. If sample data was seeded, confirm that dishes appear on the page.

Run the frontend checks:

```sh
cd frontend
npm run build
npm run lint
```

Run the backend tests:

```sh
cd backend
npm test
```

## Common problems

- **Supabase setup prompt in the UI:** check that `frontend/.env.local` exists and contains the correct URL and publishable key, then restart Vite.
- **Backend says it is not configured:** check `backend/.env` and restart the backend. Do not copy the service-role key into the frontend configuration.
- **`/api/health` reports `databaseConfigured: false`:** the backend did not load both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Dishes fail to load or the API returns a database error:** verify the table and column names, `ACTIVE` status value, Supabase credentials, and database access policies.
- **Profile is missing after registration:** verify that the Supabase Auth profile-creation trigger creates the matching `nguoi_dung` row.
- **Browser reports a CORS error:** set `FRONTEND_ORIGIN` in `backend/.env` to the exact frontend origin (locally `http://localhost:5173`) and restart the backend.
- **Email confirmation link does not return to the app:** add the frontend origin to Supabase Auth's allowed redirect URLs.

## Deploy on Vercel

Use two Vercel projects pointing at this repository:

- **Frontend:** Root Directory `frontend`, framework Vite, build command `npm run build`, output directory `dist`. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` to the backend's HTTPS origin.
- **Backend:** Root Directory `backend`, framework Express. `index.js` exports the Express application. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `FRONTEND_ORIGIN` to the exact frontend HTTPS origin, without a trailing slash. No frontend build command is needed.

Redeploy after changing environment variables. Add the deployed frontend URL to Supabase Auth's allowed redirects. Preview deployments also need matching CORS and Auth URL configuration. Linking the Supabase integration alone does not ensure these exact variable names are set.

References: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords), [server token validation](https://supabase.com/docs/reference/javascript/auth-getuser), [Express on Vercel](https://vercel.com/kb/guide/ship-a-express-app-on-vercel).

## Included scope

Signup, login, session restoration, logout, authenticated profile retrieval, and public active-dish discovery. Recipes, posts, menus, uploads, moderation, and recommendations remain future application features.
