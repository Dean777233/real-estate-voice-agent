# Real Estate Voice Agent (DealScout)

AI voice agent for real estate investors — browse listings, set criteria, save deals to your watchlist, and talk to **DealScout** via [Vapi](https://vapi.ai). Backend powered by [InsForge](https://insforge.dev).

## Run locally

1. **Environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in InsForge and Vapi keys (see comments in `.env.example`). For the anon key:

   ```bash
   npx @insforge/cli secrets get ANON_KEY
   ```

2. **Link InsForge project** (if not already linked)

   ```bash
   npx @insforge/cli link
   ```

3. **Start the web UI**

   ```bash
   cd web
   npm install
   npm run dev
   ```

4. Open **http://localhost:5173**

   The Vite app reads `web/.env.local` (copy from root `.env.local` using `VITE_*` names — see `web/.env.example`). It can also fall back to parent `NEXT_PUBLIC_*` / `VAPI_*` vars via `vite.config.ts`.

## Web app pages

| Route | Description |
|-------|-------------|
| `/listings` | Public demo listings from InsForge |
| `/login` | Email/password sign up & sign in |
| `/criteria` | Set investor criteria (markets, price, beds, cap rate, strategy) |
| `/watchlist` | Saved deals for the logged-in investor |

**Talk to DealScout** on any listing uses `@vapi-ai/web` with listing context (`listing_id`, address, price). Falls back to `POST https://api.vapi.ai/call/web` if the SDK fails.

## Demo data

- Austin listing ID: `76c2dbd6-71fe-4e33-837e-a77fdf27c292` (see `scripts/demo-ids.json`)
- Seed DB: apply migrations + `scripts/seed.sql`
- CLI demo call: `./scripts/demo-call.sh`

## Project layout

```
migrations/          InsForge SQL schema
functions/           Edge functions (Vapi tools)
scripts/             Seeds, demo call helper
web/                 Vite + React frontend
```

## Build

```bash
cd web && npm run build
```

## Testing

Vitest lives at the project root. Unit tests cover pure helpers in `lib/` (Vapi payload parsing, run-numbers math, area-report formatting, photo-analysis fallback). Integration tests POST Vapi-shaped bodies to live InsForge edge functions using the Austin demo listing (`76c2dbd6-71fe-4e33-837e-a77fdf27c292`).

```bash
npm install
npm test              # all tests
npm run test:unit     # offline unit tests only
npm run test:integration  # live InsForge functions (skipped if not linked)
```

Integration tests run when `.insforge/project.json` exists or `INSFORGE_PROJECT_ID` is set. Override the API host with `INSFORGE_BASE_URL` or `NEXT_PUBLIC_INSFORGE_URL` if needed.
