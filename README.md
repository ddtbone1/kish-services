# Kish Auto Detailing Services

Web-based booking platform for Kish Auto Detailing Services — a mobile auto detailing business in General Santos City, Philippines.

**Stack:** Next.js 16 App Router · TypeScript · Supabase PostgreSQL · Tailwind CSS · shadcn/ui · Resend · Google Gemini

---

## Requirements

Before you can run this project, you need the following ready:

### Tools (install on the new device)

| Tool    | Min version | Check     |
| ------- | ----------- | --------- |
| Node.js | 20          | `node -v` |
| npm     | 10          | `npm -v`  |

> Tip: Use [nvm](https://github.com/nvm-sh/nvm) — a `.nvmrc` file is included. Run `nvm install` then `nvm use` to get the right version.

### External accounts (must exist before filling in env vars)

| Service           | Purpose             | Where to get keys              |
| ----------------- | ------------------- | ------------------------------ |
| **Supabase**      | Database + Auth     | Project Settings → API         |
| **Resend**        | Transactional email | resend.com → API Keys          |
| **Google Gemini** | AI chatbot          | aistudio.google.com → API keys |

> For a **new device on an existing project**, request the `.env.local` values from the project owner — you do not need to create new accounts.

---

## Local Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url> kish
cd kish
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value. The required variables are:

| Variable                            | Required | Description                                          |
| ----------------------------------- | -------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | YES      | Supabase project API URL                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | YES      | Supabase anon/public key                             |
| `SUPABASE_SERVICE_ROLE_KEY`         | YES      | Supabase service role key (server-only)              |
| `GEMINI_API_KEY`                    | YES      | Google Gemini API key for chatbot                    |
| `RESEND_API_KEY`                    | YES      | Resend API key for emails                            |
| `ADMIN_EMAIL`                       | YES      | Owner email — receives chatbot escalation alerts     |
| `NEXT_PUBLIC_APP_URL`               | NO       | Deployed app URL (defaults to http://localhost:3000) |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL` | NO       | Google Maps embed URL for the Location page          |

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the dev server with hot reload |
| `npm run build` | Build for production                 |
| `npm start`     | Run the production build             |
| `npm run lint`  | Run ESLint                           |

---

## Project Structure

See [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) for the full architecture reference, database schema, and folder structure.
