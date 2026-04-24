# AI Chatbot for Local Businesses

[![CI](https://github.com/ELNAUL99/my-chatbot-app/actions/workflows/ci.yml/badge.svg)](https://github.com/ELNAUL99/my-chatbot-app/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ELNAUL99/my-chatbot-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/ELNAUL99/my-chatbot-app/actions/workflows/codeql.yml)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: Proprietary](https://img.shields.io/badge/license-proprietary-lightgrey)](#license)

A production-ready conversational AI widget for small local businesses. It answers customer questions with a grounded LLM, pulls live information from the web, looks up business data from Supabase, and can book events directly into Google Calendar — all embeddable on any website with a single `<script>` tag.

**Live demo:** [my-chatbot-app-chi.vercel.app](https://my-chatbot-app-chi.vercel.app)

---

## Highlights

- **Grounded LLM responses.** Groq-hosted inference with a retrieval pipeline that combines business data (Supabase) and live web search (Tavily) to cut hallucinations.
- **Embeddable widget.** Single-script install on any external site — no SDK integration required.
- **Actionable conversations.** Chatbot can create Google Calendar events via a service account, not just answer questions.
- **End-to-end typed.** Strict TypeScript across routes, tests, and shared libraries.
- **Quality gates.** Parallel CI jobs for lint, typecheck, test, and build; CodeQL security scan on every PR; Husky pre-commit hooks.
- **Origin-locked API.** Per-route CORS allowlist (`ALLOWED_ORIGINS`) protects the chat and calendar endpoints against cross-site abuse.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4 |
| LLM | Groq API |
| Search | Tavily API |
| Data | Supabase (Postgres + REST) |
| Integrations | Google Calendar (service account) |
| Testing | Vitest, happy-dom, jsdom |
| Tooling | ESLint 9, Husky, lint-staged |
| CI/CD | GitHub Actions + CodeQL, Vercel |

## Architecture

```
 ┌────────────┐   embed    ┌──────────────────┐    REST    ┌────────────────┐
 │  Customer  │──────────▶│  widget.js       │──────────▶│  Next.js API   │
 │  browser   │◀──────────│  (public/)       │◀──────────│  (/app/api/*)  │
 └────────────┘           └──────────────────┘            └───────┬────────┘
                                                                  │
                     ┌────────────────────────┬───────────────────┼───────────────────┐
                     ▼                        ▼                   ▼                   ▼
               Groq LLM                 Tavily web           Supabase             Google
               (reasoning)              (fresh facts)        (business data)      Calendar
```

- `/api/chat` orchestrates the conversation: loads business context, retrieves history, optionally queries the web, then calls Groq.
- `/api/business-info` exposes business metadata used by the widget to render branded UI.
- `/api/add-to-calendar` writes events to a Google Calendar via a service account, with origin checks and input validation.

## Getting Started

### Prerequisites

- Node.js 20+ (CI runs on Node 24)
- Groq API key ([console.groq.com](https://console.groq.com))
- Supabase project URL and anon key
- *(Optional)* Tavily API key for web search
- *(Optional)* Google service account for Calendar integration

### Install

```bash
git clone https://github.com/ELNAUL99/my-chatbot-app.git
cd my-chatbot-app
npm install
```

### Configure

Create `.env.local` in the project root:

```env
# LLM
GROQ_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Web search (optional)
TAVILY_API_KEY=

# CORS allowlist (comma-separated origins)
ALLOWED_ORIGINS=https://yourdomain.com

# Google Calendar (optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
CALENDAR_PIZZA=   # target calendar ID
```

### Run

```bash
npm run dev    # Next.js dev server at http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint across the project |
| `npm run typecheck` | TypeScript project-wide check (`tsc --noEmit`) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

## Project Structure

```
app/
  api/
    add-to-calendar/   # Google Calendar write endpoint
    business-info/     # Business metadata endpoint
    chat/              # Main chat + retrieval orchestration
  layout.tsx
  page.tsx
components/
  ChatPreview.tsx      # Admin-facing preview of the widget
lib/
  groq-agent.ts        # LLM client + prompt assembly
  web-search.ts        # Tavily wrapper with feature flag
public/
  widget.js            # Embeddable chat widget
tests/                 # Vitest suite covering routes, widget, and search
.github/workflows/
  ci.yml               # Parallel lint / typecheck / test / build
  codeql.yml           # Static security analysis
```

## Testing

The suite covers API route behavior, CORS enforcement, widget rendering, and the web-search adapter.

```bash
npm test
```

All four workflows (lint, typecheck, test, build) run in parallel on every push and pull request — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## CI/CD

Every change goes through the following automated gates:

1. **Local pre-commit** — Husky + lint-staged run ESLint on staged files before a commit lands.
2. **Continuous integration** — GitHub Actions runs lint, typecheck, test, and build as four parallel jobs on Node 24.
3. **Security scanning** — GitHub CodeQL (`security-and-quality` query suite) analyzes every PR and runs on a weekly schedule.
4. **Continuous deployment** — Vercel builds and deploys previews for each branch and promotes `main` to production automatically.

## API Reference

### `POST /api/chat`

Send a user message and receive an AI response. Requires the calling origin to be in `ALLOWED_ORIGINS`.

```json
{
  "message": "What time do you close on Saturday?",
  "conversationId": "uuid-optional"
}
```

### `GET /api/business-info`

Returns branded widget metadata (title, colors, welcome message).

### `POST /api/add-to-calendar`

Creates a Google Calendar event via the configured service account. Validates the payload with Zod before writing.

## Embedding the Widget

```html
<script src="https://my-chatbot-app-chi.vercel.app/widget.js" defer></script>
<div id="chatbot-widget"></div>
```

The widget pulls its branding from `/api/business-info`, so the same script serves different businesses from different origins.

## Security Notes

- All mutating endpoints enforce an origin allowlist.
- Secrets are never exposed to the client; only `NEXT_PUBLIC_SUPABASE_*` keys (which are designed to be public) reach the browser.
- Supabase row-level security is expected to be enabled on any table the anon key can reach.
- CodeQL runs `security-and-quality` queries on every PR.

## License

Proprietary. All rights reserved. Contact the author for licensing or customization inquiries.
