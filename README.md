<<<<<<< HEAD
# Hôm nay ăn gì?

React + Vite frontend, Supabase email authentication, and Express API. Uses the database you already initialized; no schema migrations are applied by this repository.

## Run locally

Node.js 22.12+ (Node 24 recommended). In the repository root:

```sh
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Fill in those two files:

- `frontend/.env.local`: your Supabase URL and **publishable** (or legacy anon) key.
- `backend/.env`: the same URL and your **service-role** key. Keep this server-only; never add it to a `VITE_` variable.

In two terminals:

```sh
cd backend
npm ci
npm run dev
```

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to port 3000. If you change the API port, update `frontend/vite.config.js` too. Missing configuration is displayed rather than silently showing demo data.

## Supabase

Your existing schema must expose `mon_an(ma_mon, ten_mon, mo_ta_ngan, hinh_anh, trang_thai)` and `nguoi_dung(ma_nd, ten_hien_thi, anh_dai_dien, vai_tro, trang_thai)` with `ACTIVE` status values. The actual earlier migration was not included in the attachment, so these names and values follow the pasted design; verify them against your database.

Keep email authentication enabled. Under Auth → URL Configuration, allow `http://localhost:5173` and your production frontend URL, and set the production Site URL. Registration sends `display_name` metadata; your existing profile trigger should use it. The API reports a missing profile if that trigger isn't working. The UI never creates or assigns account roles.

Optionally execute `supabase/seed.sql` in SQL Editor to add five dishes. It skips dishes whose names already exist. It does not recreate your database or change RLS policies. Application table reads go through Express; browser Supabase access is for Auth only.

## Verify

1. Open `/api/health` on port 3000: `databaseConfigured` should be true (this checks configuration presence, not connectivity).
2. Register, follow the confirmation email if enabled, and sign in. Your display name and account status should appear.
3. Refresh the page to verify session restoration, then sign out.
4. Check that seeded dishes appear. A database error or missing profile is shown explicitly.

```sh
cd frontend
npm run build
npm run lint
```

```sh
cd backend
npm test
```

## Deploy on Vercel

Use **two Vercel projects pointing at this repository**:

- Frontend: Root Directory `frontend`, framework Vite, build `npm run build`, output `dist`. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` (the backend's HTTPS origin).
- Backend: Root Directory `backend`, framework Express. `index.js` exports the Express application. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `FRONTEND_ORIGIN` (the exact frontend HTTPS origin, no trailing slash). No frontend build command is needed here.

Redeploy after environment variable changes. Add your deployed frontend URL to Supabase Auth's allowed redirects. Preview deployments need their own matching CORS/auth URL configuration. Linking the Supabase integration alone does not guarantee these exact variable names are configured.

References: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords), [server token validation](https://supabase.com/docs/reference/javascript/auth-getuser), [Express on Vercel](https://vercel.com/kb/guide/ship-a-express-app-on-vercel).

## Included scope

Signup, login, session restoration, logout, authenticated profile retrieval, and public active-dish discovery. Recipes, posts, menus, uploads, moderation, and recommendations remain future application features.
=======
# NMCNPM-Lab
>>>>>>> origin/main
