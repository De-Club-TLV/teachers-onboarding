# Teachers Onboarding

A single-page web form for DeClub to onboard new teachers.

## Setup

1. Clone the repo:
   ```bash
   git clone git@github.com:De-Club-TLV/teachers-onboarding.git
   cd teachers-onboarding
   ```
2. Copy env template:
   ```bash
   cp .env.example .env
   ```
3. Fill in any required values in `.env`.

## Run locally

Open `index.html` directly in a browser, or run a local dev server:

```bash
npx serve .
```

## Deploy

Pushing to `main` triggers a Netlify build and deploy automatically (once the repo is connected in Netlify).

## Structure

```
.
├── index.html         # the form page
├── .claude/           # Claude Code config and agents
├── CLAUDE.md          # project instructions for Dasha
├── SESSION_LOG.md     # work session log
├── .env.example       # environment variable template
└── README.md
```

## Contributing / Review

- Open a PR against `main`
- Keep the page lightweight — no frameworks unless necessary
- Verify the form submits correctly on a preview deploy before merging
