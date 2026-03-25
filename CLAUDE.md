# LeadFlow — Project CLAUDE.md

## Document Index

| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (all entities) |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/scoring.ts` | Lead priority scoring engine (0-100) |
| `src/lib/llm.ts` | LLM client wrapper (Anthropic/OpenAI) |
| `src/lib/transcription.ts` | Audio transcription via OpenAI Whisper |
| `src/lib/call-notes.ts` | AI-structured note extraction from transcripts |
| `src/lib/company-summary.ts` | Company-level rolling summary generation |
| `src/lib/project-summary.ts` | Project-level cross-company summary generation |
| `src/types/index.ts` | Shared TypeScript types and enums |
| `src/app/api/` | All API route handlers |
| `src/app/api/calls/` | Call upload, transcription, and note generation |
| `src/app/api/summaries/` | Summary generation endpoints |
| `src/components/ui/` | shadcn/ui base components |
| `docker-compose.yml` | Local PostgreSQL container |
| `.env.local` | Environment variables (DATABASE_URL, API keys) |

## Tech Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **PostgreSQL** via Docker (local-first, cloud-sync later)
- **Prisma** ORM
- **shadcn/ui + Tailwind CSS** for UI
- **Anthropic/OpenAI API** for LLM features (user-provided key)
- **OpenAI Whisper API** for audio transcription
- No auth (single user, local)

## Key Entities

- **Project** — Groups leads by campaign (e.g., "Q1 SMB Outreach")
- **Lead** — A person/company being contacted (belongs to a Project)
- **LeadStage** — Tracks pipeline progression with timestamps
- **Touchpoint** — Every interaction (email, call, DM) logged with channel + direction
- **Call** — Audio/video recording or manual notes for a lead conversation
- **CallNote** — AI-structured notes extracted from a call (summary, key points, objections, sentiment)
- **Summary** — AI-generated rolling summaries at lead or project scope
- **OutreachSequence** — Multi-step follow-up cadence per lead
- **ResearchSession** — AI-assisted lead discovery conversations

## Conversation Stages

`Lead → Intro Call → Demo → Pilot → Closed`

Separate from pipeline stages — tracks the depth of the actual conversation relationship.

## Pipeline Stages

`Researched → Contacted → Responded → Meeting Booked → Proposal Sent → Closed Won / Closed Lost`

## Lead Scoring (0-100)

Weighted factors: Engagement recency (30%), Pipeline stage (25%), Decision-maker level (15%), Company size (10%), Follow-up urgency (10%), Channel responsiveness (10%). Recalculates on touchpoint/stage changes.

## Architecture Decisions

- Leads are always scoped to a Project — never orphaned
- Leads are grouped by company name on the project leads page
- Server Actions for mutations, Server Components for reads
- Lead scoring is a pure function in `src/lib/scoring.ts`, called after any touchpoint or stage update
- LLM calls go through `src/lib/llm.ts` which abstracts provider differences
- All API routes under `src/app/api/` follow REST conventions
- API keys are masked after save — only `sk-...last4` returned from GET
- Audio files stored temporarily for transcription, transcripts persisted in DB

## Workflows

- **Adding a lead:** Project context required → fill form → auto-enters "Researched" stage → score computed
- **Logging a touchpoint:** Select lead → log channel/direction/content → score recalculates → next touch date updates
- **Logging a call:** Select lead → upload audio (m4a/mp4) or type manual notes → Whisper transcription → Claude structured notes → company summary regenerates
- **Drafting a message:** Select lead → LLM uses lead context (name, company, stage, history) → user edits and sends
- **Lead research:** Describe ideal lead → LLM suggests sources/strategies → user researches manually → converts findings to leads

## Learned Corrections
<!-- Add correction rules here as they arise -->
