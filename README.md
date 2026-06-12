# Virgos — venue guest-app template

The reusable front-end for **every** Virgo venue. It's venue-agnostic: the menu,
spot config, and **branding (logo + colors)** all come from the shared platform
API (`/api/v/<slug>/menu`). The same skeleton themes itself per venue.

## Create a new venue app
1. Use this template (GitHub → "Use this template") or fork it.
2. Set the venue: copy `.env.example` to `.env` and set `VITE_VENUE_SLUG=<slug>`
   (the slug you onboarded on the backend).
3. `npm install` · `npm run dev` (local) / `npm run build` (deploy).

That's it — it renders that venue's menu + branding. No per-venue code.

> Venue can also be chosen at runtime by `?v=<slug>` or a `<slug>.virgos.io`
> subdomain; `VITE_VENUE_SLUG` is the build-time default for a dedicated deploy.

## Onboarding a venue (backend, in virgo-platform)
`scripts/onboard.mjs` (venue + spots) → `scripts/seed-menu.mjs` (menu) → set
`venues.branding` (logo + colors). Then fork this template and set the slug.
