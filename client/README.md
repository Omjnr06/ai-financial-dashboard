# The Vault: Frontend Setup

## First time setup

1. Install dependencies:
```bash
   npm install
```
2. Copy `.env.example` to a new file you create called `.env.local` (this never gets pushed. it's gitignored):
```bash
   cp .env.example .env.local
```
3. Keep `NEXT_PUBLIC_USE_MOCKS=true` to work against mock data. When it's time to hit the real backend, change it to `false`.
4. Run the dev server:
```bash
   npm run dev
```
   Opens at http://localhost:3000

## Working with mocks

- With `NEXT_PUBLIC_USE_MOCKS=true`, API calls return fake data from `mocks/` instead of hitting the backend so pages can be built before the backend endpoint exists.
- **Restart the dev server after any `.env.local` change.** 

## Conventions

- Colors: use the semantic Tailwind tokens (`bg-surface`, `text-accent`, etc.), never hex codes  the app has switchable themes.
- Shared UI componennts lives in `components/ui/` — any ui that you think will be used throughout the app, put it there then call it on the page.
- Branch as `yourname/short-description`, open a PR, don't push to `main`.
