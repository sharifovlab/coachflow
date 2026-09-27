# CoachFlow

CRM for online fitness coaches in Baku: clients, payments (monthly, packages, installments), programs, meal plans with local food, client check-ins by private link, and a public page for Instagram that collects leads. Azerbaijani and Russian.

Live: https://coachflow-cyan.vercel.app

## How it is built

- `web/` — the site. Plain HTML, CSS and JavaScript, no build step.
  - `app.js` — the whole app: coach dashboard (`/`), client screen (`/c/<token>`), public coach page (`/p/<slug>`).
  - `i18n.js`, `i18n-fix.js` — texts in AZ and RU.
  - `foods.js` — local food database (approximate kcal and macros per 100 g).
  - `vercel.json` — routes `/c/*` and `/p/*` to the app.
- `supabase/migrations/` — database schema, security rules and functions, in the order they were applied.

## Services

- **Supabase** (project `coachflow`, region eu-central-1): database, coach login, private photo storage.
  Every table has row-level security: a coach only sees their own rows. Clients and page visitors never touch tables directly; they go through a few database functions that check the client link or rate-limit leads.
- **Vercel** (project `coachflow`): hosting. Serves `web/` as static files.

The Supabase key in `app.js` is the publishable key. It is meant to be public; the data is protected by the security rules, not by hiding the key.

## Deploying

Vercel serves the `web/` folder. Set the project's Root Directory to `web` when connecting this repository in Vercel, and every push to `main` goes live.

Database changes go in a new file in `supabase/migrations/` and are applied to the Supabase project.

## Setup checklist

- Supabase → Authentication → Sign In / Providers → Email: turn off "Confirm email" until a custom email sender is set up.
- Supabase → Authentication → URL Configuration → Site URL: `https://coachflow-cyan.vercel.app`.
