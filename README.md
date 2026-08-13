# HH Goa 2026 — Builder ID Generator

A slick, single-page web app that lets hackers, makers and shippers generate their own premium **HH Goa 2026 Builder ID** card — upload a photo, add your name and stack, pick a builder class, and download a shareable PNG. Optional Supabase integration lets every generated card sync to the cloud.

**Live app:** [_add your Vercel URL here_](https://id-builder-iota.vercel.app/)

---

## Features

- **Photo upload** with drag-and-drop, replace, and zoom/reposition controls
- **Name & team** input
- **Stack / role picker** — choose from preset chips or add a custom stack
- **Builder Class** title readout, generated based on your selections
- **Canvas-based card rendering** — real-time preview of the final ID card
- **One-click PNG download** — works fully offline, no backend required
- **Share** button for quick sharing
- **Supabase sync** — persists card metadata + image to the cloud (non-blocking; app works perfectly even if this is never configured)
- Responsive, mobile-friendly UI with a custom intro/landing animation

---

## Project Structure

```
HH-GOA-ID-Builder/
├── index.html            # App markup & structure
├── script.js              # All app logic (canvas rendering, upload, Supabase sync)
├── style.css               # Styling & animations
├── config.example.js       # Template for Supabase config (copy → config.js)
├── config.js                # Your local Supabase config (gitignored, not in repo)
├── supabase-schema.sql     # SQL to set up the optional Supabase backend
├── assets/
│   ├── images/               # Static images (backgrounds etc.)
│   └── branding/              # Logos & brand marks
└── .gitignore
```

---

## Getting Started

### Run it locally — zero setup

This is a fully static app. No build tools, no `npm install`, no framework.

1. Clone the repo
   ```bash
   git clone https://github.com/<your-username>/HH-GOA-ID-Builder.git
   cd HH-GOA-ID-Builder
   ```
2. Open `index.html` directly in your browser (or serve it with any static server).

That's it — photo upload, card generation, and PNG download all work completely offline.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. On [vercel.com]([https://vercel.com](https://id-builder-iota.vercel.app/)) → **Add New → Project** → import the repo.
3. Framework preset: **Other** (no build command / output directory needed — leave blank).
4. Click **Deploy**.

Every `git push` to `main` will auto-deploy a new version.

> Note: since this is a static frontend app, `config.js` is deployed as-is along with the rest of the files. This is safe **only** because it contains the public anon key with RLS policies enforced — never place secret keys here.

---

##  Security Notes

- Row Level Security (RLS) is enabled on the `builder_cards` table and the `builder-cards` storage bucket:
  - **Anonymous users can only INSERT** — no read, update, or delete access from the browser.
  - To view submitted data, use the Supabase dashboard **Table Editor**, or query with the `service_role` key from a trusted backend context only.

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no framework, no build step)
- HTML5 Canvas for card rendering
- [Supabase](https://supabase.com) - Postgres database + object storage

---

Built for **HH Goa 2026** 🏝️
