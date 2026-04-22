# Teachers Onboarding

## Project
A single-page web form for **DeClub** to onboard new teachers — collects their details, experience, and availability. Deployed on **Netlify**.

## Stack
- Plain HTML / CSS / vanilla JS (no framework, no build step)
- Netlify for hosting + deploy
- **Netlify Forms** for submission capture — form name: `teachers-onboarding`, honeypot: `bot-field`

## Commands
- **Run locally**: `npx serve . -p 4321` then open `http://localhost:4321`
- **Deploy**: push to `main` — Netlify auto-deploys from the connected GitHub repo

## Brand tokens (pulled from declub.co.il/styles.css)
- Background: `#000000`
- Accent (sage): `#D1DCBD` / hover green: `#B0C290`
- Text (cream): `#f5f0e8`, muted: `#b0aba3`
- Fonts: **Figtree** (body), **IBM Plex Mono** (labels, buttons)
- Pill buttons (`border-radius: 100px`), inputs use `12px` radius, uppercase labels with letter-spacing.

## Conventions
- Keep the page self-contained and lightweight
- No build step unless genuinely required
- Mirror DeClub's minimal luxury aesthetic: dark, sage-accented, mono-spaced labels
- Any form-field change: update `index.html` AND the corresponding field set; Netlify auto-detects new fields on next deploy

## Agents Policy
Project-specific agents live in `.claude/agents/`. **New agents require Yuval's approval.** Only create one when the task genuinely needs something Dasha's general agents don't cover.
