# Kish Auto Detailing Services

Web-based booking platform for Kish Auto Detailing Services, a mobile auto detailing business in General Santos City, Philippines.

**Stack:** Next.js 16 App Router, TypeScript, Supabase PostgreSQL, Tailwind CSS, shadcn/ui, Nodemailer/SMTP, Upstash Redis, Google Gemini

---

## Requirements

Before you can run this project, you need the following ready:

### Tools

| Tool    | Min version | Check     |
| ------- | ----------- | --------- |
| Node.js | 20          | `node -v` |
| npm     | 10          | `npm -v`  |

Tip: use [nvm](https://github.com/nvm-sh/nvm). A `.nvmrc` file is included, so run `nvm install` then `nvm use`.

### External accounts

| Service           | Purpose                   | Where to get keys                         |
| ----------------- | ------------------------- | ----------------------------------------- |
| Supabase          | Database + Auth           | Project Settings -> API                   |
| SMTP provider     | Transactional email       | Gmail App Password or SMTP credentials    |
| Upstash Redis     | Distributed rate limiting | Redis database -> REST API                |
| Google Gemini     | AI chatbot                | https://aistudio.google.com -> API keys   |

For a new device on an existing project, request the `.env.local` values from the project owner. You do not need to create new accounts.

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

Open `.env.local` and fill in the values.

| Variable                            | Required | Description                                          |
| ----------------------------------- | -------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | Yes      | Supabase project API URL                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Yes      | Supabase anon/public key                             |
| `SUPABASE_SERVICE_ROLE_KEY`         | Yes      | Supabase service role key, server-only               |
| `GEMINI_API_KEY`                    | Yes      | Google Gemini API key for chatbot                    |
| `SMTP_HOST`                         | Yes      | SMTP server host                                     |
| `SMTP_PORT`                         | Yes      | SMTP server port                                     |
| `SMTP_USER`                         | Yes      | SMTP username / sender email                         |
| `SMTP_PASS`                         | Yes      | SMTP password or app password                        |
| `ADMIN_EMAIL`                       | Yes      | Owner email for chatbot escalation alerts            |
| `UPSTASH_REDIS_REST_URL`            | No       | Upstash REST URL for distributed API rate limiting   |
| `UPSTASH_REDIS_REST_TOKEN`          | No       | Upstash REST token for distributed API rate limiting |
| `NEXT_PUBLIC_APP_URL`               | No       | Deployed app URL, defaults to http://localhost:3000  |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL` | No       | Google Maps embed URL for the Location page          |

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
| `npm test`      | Run the Vitest test suite            |

---

## CI/CD

GitHub Actions runs lint, tests, and a production build on pushes and pull requests to `main`.

Deployment can be connected to Vercel after the required environment variables are added to the hosting provider and GitHub repository secrets.

---

## Project Structure

See [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) for the full architecture reference, database schema, and folder structure.
