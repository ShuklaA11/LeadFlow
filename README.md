# LeadFlow

A local-first lead management system for tracking sales pipelines, scoring leads, and drafting AI-powered outreach messages.

Built with Next.js 14, PostgreSQL, Prisma, and Ollama for local LLM inference.

## Features

- **Project-based lead organization** — Group leads by campaign (e.g., "Q1 SMB Outreach", "SBA Lending")
- **Pipeline tracking** — Move leads through stages: Researched, Contacted, Responded, Meeting Booked, Proposal Sent, Closed Won/Lost
- **Lead scoring** — Automatic 0-100 priority scores based on engagement recency, pipeline stage, decision-maker level, company size, follow-up urgency, and channel responsiveness
- **Touchpoint logging** — Track every interaction (email, call, LinkedIn DM) with timestamps and direction
- **Outreach sequences** — Multi-step follow-up cadences with configurable intervals
- **AI message drafting** — Generate personalized outreach messages using lead context, touchpoint history, and campaign goals
- **AI lead research** — Describe your ideal customer and get ICP definitions, search strategies, and outreach angles
- **Web search integration** — LangChain agent with DuckDuckGo search lets the AI pull real company data and industry info
- **Bulk CSV import** — Import leads from spreadsheets with field mapping
- **No auth required** — Single-user, runs entirely on your machine

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Server Components) |
| Database | PostgreSQL 16 via Docker |
| ORM | Prisma |
| UI | shadcn/ui + Tailwind CSS |
| LLM | Ollama (Qwen 3.5, Llama, etc.) / Anthropic / OpenAI |
| AI Agents | LangChain + LangGraph (ReAct agent with web search) |

## Prerequisites

- **Node.js** >= 20
- **Docker** (for PostgreSQL)
- **Ollama** (for local LLM — optional if using Anthropic/OpenAI API keys)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/ShuklaA11/lead-management.git
cd lead-management
npm install --legacy-peer-deps
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL on port `5433` with database `lead_management`.

### 3. Configure environment

Create a `.env` file:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/lead_management"
```

No API keys are needed if using Ollama. For cloud LLMs, configure keys in the app's Settings page.

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## LLM Configuration

LeadFlow supports three LLM providers, configurable in **Settings**:

### Ollama (Local — recommended)

No API key needed. Install and pull a model:

```bash
brew install ollama
ollama pull qwen3.5:4b
ollama serve
```

The app connects to Ollama at `http://localhost:11434`. Currently configured to use `qwen3.5:4b`.

### Anthropic / OpenAI

Enter your API key in Settings. Uses `claude-sonnet-4-20250514` (Anthropic) or `gpt-4o` (OpenAI).

### Web Search

Enable the **Web Search** toggle in Settings (Ollama only). This gives the AI access to DuckDuckGo search via a LangChain ReAct agent, so it can look up real company info, recent news, and industry data when drafting messages or researching leads.

## Project Structure

```
src/
  app/
    api/
      leads/          # CRUD + bulk import
      llm/draft/      # AI message drafting
      llm/research/   # AI lead research
      projects/       # Project CRUD
      scoring/        # Lead score recalculation
      settings/       # App configuration
      touchpoints/    # Interaction logging
    leads/[id]/       # Lead detail page
    projects/         # Project list + detail pages
    settings/         # Settings page
  components/
    ui/               # shadcn/ui base components
    email-composer    # AI-powered email drafting dialog
    lead-edit-dialog  # Edit lead contact info
    stage-updater     # Pipeline stage selector
    sidebar           # App navigation
  lib/
    db.ts             # Prisma client singleton
    llm.ts            # LLM provider abstraction (Anthropic/OpenAI/Ollama)
    llm-agent.ts      # LangChain agent with DuckDuckGo web search
    scoring.ts        # Lead priority scoring engine
    utils.ts          # Date formatting helpers
  types/
    index.ts          # Shared TypeScript enums and label maps
prisma/
  schema.prisma       # Database schema
docker-compose.yml    # Local PostgreSQL container
```

## Pipeline Stages

`Researched` → `Contacted` → `Responded` → `Meeting Booked` → `Proposal Sent` → `Closed Won` / `Closed Lost`

## Lead Scoring

Scores range from 0-100, calculated from weighted factors:

| Factor | Weight |
|--------|--------|
| Engagement recency | 30% |
| Pipeline stage | 25% |
| Decision-maker level | 15% |
| Company size | 10% |
| Follow-up urgency | 10% |
| Channel responsiveness | 10% |

Scores recalculate automatically when touchpoints are logged or stages change.

## License

Private project.
