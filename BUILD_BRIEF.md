# OutboundAI — Build Brief

## Overview
AI-native B2B sales platform for startups. A Monaco clone that automates customer acquisition and revenue growth — from prospecting to closing. All-in-one: CRM + prospect database + AI outreach + meeting intelligence + pipeline analytics.

**Business Name:** OutboundAI
**Slug:** outbound-ai
**Model:** B2B SaaS
**Target:** Seed/Series A startups without sales teams
**Pricing:** Base subscription ($149/mo) + usage credits (enrichment, AI, transcription)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL + pgvector + RLS) |
| Auth | Supabase Auth (email + Google OAuth) |
| Payments | Stripe (subscription + usage metering) |
| Workflow orchestration | Inngest |
| Email sending | Gmail API / Microsoft Graph (OAuth, send as user) |
| Email receiving | Gmail API / Microsoft Graph (webhooks for incoming) |
| AI — email writing | Claude Sonnet 4 via Anthropic API |
| AI — classification/scoring | Kimi K2 via OpenRouter (cheapest) |
| AI — real-time/fast | Groq (Llama 4 Scout) |
| Embeddings | OpenAI text-embedding-3-small + pgvector |
| Data enrichment | Apollo.io API (all-in-one: companies, contacts, emails, LinkedIn) |
| Tech stack detection | Wappalyzer (self-hosted / free API) |
| Funding data | OpenVC dataset + Apollo |
| Scheduling | Cal.com (open source) embedded |
| Call recording | Recall.ai API |
| Transcription | Deepgram API |
| Hosting | Vercel |
| Caching | Upstash Redis (API response caching) |

---

## Database Schema

### Core Tables

```sql
-- Companies (enriched from Apollo)
create table companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  name text not null,
  domain text,
  industry text,
  employee_count integer,
  funding_stage text,
  funding_total numeric,
  tech_stack text[],
  location text,
  description text,
  linkedin_url text,
  apollo_id text,
  enrichment_data jsonb,
  fit_score numeric, -- AI-calculated ICP fit
  intent_score numeric, -- signals-based
  combined_score numeric generated always as (fit_score * 0.6 + intent_score * 0.4) stored,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  company_id uuid references companies(id),
  first_name text,
  last_name text,
  email text,
  email_verified boolean default false,
  title text,
  role_type text, -- champion, decision_maker, influencer, end_user
  phone text,
  linkedin_url text,
  apollo_id text,
  signals jsonb, -- job changes, activity, connections
  contact_priority integer, -- sequence order (1 = first to contact)
  enrichment_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Deals / Pipeline
create table deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  company_id uuid references companies(id),
  contact_id uuid references contacts(id),
  title text not null,
  stage text default 'prospect', -- prospect, contacted, meeting_booked, proposal, negotiation, closed_won, closed_lost
  value numeric,
  probability numeric, -- AI-calculated
  close_date date,
  notes text,
  ai_next_action text,
  ai_risk_score numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Interactions (unified event log)
create table interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  contact_id uuid references contacts(id),
  deal_id uuid references deals(id),
  type text not null, -- email_sent, email_received, email_opened, email_clicked, call, meeting, note, stage_change
  subject text,
  content text,
  metadata jsonb, -- email headers, call duration, meeting attendees, etc.
  sentiment text, -- positive, neutral, negative
  created_at timestamptz default now()
);

-- Email Sequences
create table sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  name text not null,
  description text,
  status text default 'draft', -- draft, active, paused, completed
  steps jsonb not null, -- array of {step_number, delay_days, subject_template, body_template, variant}
  settings jsonb, -- send_window, timezone, max_per_day, skip_weekends
  stats jsonb default '{}', -- open_rate, reply_rate, meeting_rate
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sequence Enrollments (contact in a sequence)
create table sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references sequences(id),
  contact_id uuid references contacts(id),
  status text default 'active', -- active, paused, completed, replied, bounced, unsubscribed
  current_step integer default 0,
  next_send_at timestamptz,
  ab_variant text, -- A or B for split testing
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sent Emails
create table sent_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  enrollment_id uuid references sequence_enrollments(id),
  contact_id uuid references contacts(id),
  message_id text, -- email Message-ID header
  thread_id text, -- Gmail/Outlook thread ID
  subject text,
  body_html text,
  body_text text,
  status text default 'sent', -- sent, delivered, opened, clicked, replied, bounced
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  bounce_reason text,
  spam_score numeric,
  created_at timestamptz default now()
);

-- Workspaces (multi-tenant)
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  icp_config jsonb, -- ideal customer profile definition
  sending_config jsonb, -- connected email accounts, sending limits
  subscription_tier text default 'beta',
  stripe_customer_id text,
  stripe_subscription_id text,
  enrichment_credits_remaining integer default 500,
  ai_credits_remaining integer default 1000,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workspace Members
create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  user_id uuid references auth.users(id),
  role text default 'member', -- owner, admin, member
  created_at timestamptz default now()
);

-- Connected Email Accounts
create table email_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  user_id uuid references auth.users(id),
  provider text not null, -- gmail, outlook
  email text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  daily_send_limit integer default 50,
  sends_today integer default 0,
  warmup_stage text default 'cold', -- cold, warming, warm
  dkim_verified boolean default false,
  spf_verified boolean default false,
  dmarc_verified boolean default false,
  created_at timestamptz default now()
);

-- Suppression List
create table suppressions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  email text not null,
  reason text, -- bounced, unsubscribed, manual, complaint
  created_at timestamptz default now()
);

-- Meetings (from meeting intelligence)
create table meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  deal_id uuid references deals(id),
  contact_id uuid references contacts(id),
  title text,
  start_time timestamptz,
  end_time timestamptz,
  recording_url text,
  transcript text,
  ai_summary text,
  action_items jsonb,
  sentiment_analysis jsonb,
  suggested_stage text, -- AI recommendation for deal stage after meeting
  created_at timestamptz default now()
);

-- ICP Presets
create table icp_presets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  name text not null,
  filters jsonb not null, -- industry, size, funding_stage, tech_stack, geography, etc.
  created_at timestamptz default now()
);
```

### Row Level Security
All tables use workspace_id for RLS. Users can only see data in their workspace.

### Indexes
- companies: btree on workspace_id, domain; GIN on tech_stack; ivfflat on embedding
- contacts: btree on workspace_id, company_id, email
- interactions: btree on workspace_id, contact_id, created_at
- sent_emails: btree on workspace_id, message_id, thread_id
- sequence_enrollments: btree on sequence_id, contact_id, next_send_at

---

## 6 Core Systems — Detailed Specs

### System 1: AI-Native CRM

**Pages:**
- `/dashboard` — Overview: pipeline value, active sequences, recent activity, AI recommendations
- `/accounts` — List view (not kanban) of companies, sortable by fit_score, intent_score, combined_score. Bulk actions. Filter by ICP, stage, signals.
- `/accounts/[id]` — Company detail: contacts, interactions timeline, deals, enrichment data, similar companies (pgvector), AI insights
- `/contacts` — All contacts with search, filter by role_type, company, sequence status
- `/contacts/[id]` — Contact detail: full timeline, sequence enrollment, emails, meetings
- `/pipeline` — Deal pipeline: list view default + optional kanban toggle. AI-scored probability. At-risk deals highlighted.
- `/pipeline/[id]` — Deal detail: full history, AI next-action recommendation, meeting prep notes

**AI Features:**
- Auto-update CRM from email replies (parse and classify)
- AI-generated next-action suggestions per deal
- Risk scoring: flag deals going silent (no interaction > X days)
- Auto-create interactions from email sends/receives
- Smart search across all entities using embeddings

### System 2: Prospect Database (TAM Builder)

**Pages:**
- `/prospects` — TAM builder interface
- `/prospects/icp` — ICP definition wizard (industry, size, funding stage, tech stack, geography, keywords)
- `/prospects/discover` — AI-powered discovery: search Apollo, score results, preview before import

**Flow:**
1. User defines ICP via wizard or preset
2. System queries Apollo.io API with filters
3. Results scored on fit (ICP match) + intent (signals)
4. Stack-ranked list presented with company + key contact details
5. User selects prospects to import → creates companies + contacts in CRM
6. Buyer identification: for each company, identify champion, decision-maker, influencer
7. Recommend contact sequence order

**Enrichment Pipeline (Inngest):**
1. On import: enrich company via Apollo (firmographics, tech stack, funding)
2. Enrich contacts (email verification, LinkedIn data, signals)
3. Generate embedding for company description → store in pgvector
4. Calculate fit_score via AI
5. Detect intent signals (recent funding, hiring, tech changes)
6. Cache all API responses in Upstash Redis (24h TTL)

### System 3: AI Outreach Engine

**Pages:**
- `/sequences` — List all sequences with stats (open rate, reply rate, meetings booked)
- `/sequences/new` — AI sequence builder: describe your product + target → AI generates 3-5 step sequence
- `/sequences/[id]` — Sequence detail: steps, enrolled contacts, per-step analytics, A/B variants
- `/inbox` — Unified inbox: all replies across sequences, AI-classified (interested/not/objection/OOO/wrong person)
- `/inbox/[id]` — Reply detail with AI-drafted response, one-click send or edit

**Sequence Execution (Inngest workflows):**
1. `sequence.enroll` — Add contact to sequence, calculate send times
2. `sequence.send-step` — For each enrolled contact at their next step:
   a. Check suppression list
   b. Check daily send limit
   c. Generate personalised email via Claude Sonnet 4 (company context + contact role + previous interactions + sequence step template)
   d. Run spam score check via Groq
   e. Send via Gmail/Outlook API (as the user)
   f. Track: create sent_email record, create interaction record
   g. Schedule next step
3. `sequence.process-reply` — When reply detected:
   a. Classify via Kimi K2 (interested/not/objection/OOO/wrong person)
   b. If interested → auto-create deal, notify user, pause sequence for contact
   c. If objection → AI-draft response for review
   d. If bounced → add to suppression list
   e. If unsubscribe → add to suppression list

**Email Deliverability:**
- DKIM/SPF/DMARC verification check on connected accounts
- Spam score pre-check before every send
- Bounce handling: auto-suppress
- Unsubscribe link in every email (CAN-SPAM compliance)
- Quiet hours respect (don't send outside business hours in recipient's timezone)
- Daily send throttling per connected account
- Warmup mode: gradually increase sends for new accounts

**A/B Testing:**
- Per-step variant support (A/B subject lines, body copy)
- Random assignment on enrollment
- Stats tracked per variant: open rate, reply rate, meeting rate

### System 4: Meeting Intelligence

**Pages:**
- `/meetings` — List of past/upcoming meetings with AI summaries
- `/meetings/[id]` — Meeting detail: recording player, transcript, AI summary, action items, deal impact

**Flow (Inngest workflows):**
1. User connects calendar (Google Calendar API)
2. System detects meetings with contacts in CRM
3. Pre-meeting: generate prep notes (contact history, deal stage, talking points, likely objections)
4. During meeting: Recall.ai bot joins and records
5. Post-meeting: Deepgram transcribes → AI generates summary, action items, sentiment analysis
6. Auto-update deal with meeting notes
7. AI suggests deal stage change based on meeting content
8. Create follow-up tasks

### System 5: Pipeline Analytics

**Pages:**
- `/analytics` — Dashboard with:
  - Pipeline value by stage (funnel visualization)
  - Conversion rates between stages
  - Win/loss analysis
  - Sequence performance comparison
  - Revenue attribution: which sequences → meetings → deals
  - Average deal cycle length
  - Activity metrics: emails sent, replies received, meetings booked
  - AI forecast: predicted revenue based on pipeline + historical close rates

**AI Features:**
- Deal health scoring (engagement frequency, response times, stakeholder count)
- At-risk deal alerts (going silent, negative sentiment)
- Recommended actions per deal
- Sequence optimization suggestions based on performance data

### System 6: Human-in-the-Loop

**Pages:**
- `/review` — Email review queue: AI-drafted emails pending approval
  - Approve (send immediately)
  - Edit and approve
  - Reject (remove from sequence)
  - Bulk approve with spot checks

**Training Loop:**
- When user edits AI-drafted emails, store the edit as training data
- Use edits as few-shot examples in future prompts for that workspace
- Over time, AI learns the company's voice, product positioning, and objection handling

**Meeting Prep:**
- Auto-generated prep cards before every meeting
- Includes: contact background, company info, deal history, previous interactions, competitive intel, suggested talking points

**Escalation Rules:**
- High-value prospects (enterprise) → always require human review
- Unusual reply patterns → flag for review
- Multiple bounces from same domain → alert

---

## Pages Summary

```
/                          → Marketing landing page
/login                     → Auth (Supabase)
/signup                    → Onboarding wizard
/onboard                   → Connect inbox → Define ICP → Import leads → Generate first sequence
/dashboard                 → Overview hub
/accounts                  → Companies list (TAM)
/accounts/[id]             → Company detail
/contacts                  → Contacts list
/contacts/[id]             → Contact detail
/pipeline                  → Deals pipeline
/pipeline/[id]             → Deal detail
/prospects                 → TAM builder
/prospects/icp             → ICP wizard
/prospects/discover        → AI discovery
/sequences                 → Sequences list
/sequences/new             → AI sequence builder
/sequences/[id]            → Sequence detail
/inbox                     → Unified inbox (replies)
/inbox/[id]                → Reply detail
/meetings                  → Meetings list
/meetings/[id]             → Meeting detail
/analytics                 → Pipeline analytics
/review                    → Email review queue
/settings                  → Workspace settings
/settings/email            → Connected email accounts + deliverability
/settings/billing          → Stripe subscription + usage
/settings/team             → Team members + roles
/settings/integrations     → Calendar, Apollo, etc.
```

---

## Inngest Functions (Workflow Orchestration)

```
enrichment/company-enrich     — Enrich company from Apollo
enrichment/contact-enrich     — Enrich contact + verify email
enrichment/batch-enrich       — Bulk enrichment with rate limiting
sequence/enroll-contact       — Add contact to sequence
sequence/send-step            — Send individual email step
sequence/process-reply        — Classify and handle reply
sequence/check-bounces        — Monitor for bounces
meeting/pre-meeting-prep      — Generate prep notes
meeting/post-meeting-process  — Transcribe + summarize + update CRM
analytics/daily-rollup        — Aggregate daily stats
analytics/deal-scoring        — Recalculate deal probabilities
ai/generate-email             — Claude Sonnet 4 email generation
ai/classify-reply             — Kimi K2 reply classification
ai/score-lead                 — Lead scoring pipeline
ai/spam-check                 — Pre-send spam score
```

---

## API Routes

```
/api/auth/callback            — OAuth callback (Gmail, Google Calendar)
/api/webhooks/stripe          — Stripe webhook
/api/webhooks/gmail           — Gmail push notification webhook
/api/webhooks/inngest         — Inngest webhook
/api/apollo/search            — Proxy Apollo search (with caching)
/api/apollo/enrich            — Proxy Apollo enrichment
/api/ai/generate-email        — Generate email copy
/api/ai/classify              — Classify reply
/api/ai/score                 — Score lead/deal
/api/email/send               — Send email via connected account
/api/email/connect            — OAuth flow for Gmail/Outlook
/api/calendar/connect         — OAuth flow for Google Calendar
/api/meetings/recording       — Recall.ai webhook for recordings
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI Models
ANTHROPIC_API_KEY=          # Claude Sonnet 4 for email generation
OPENROUTER_API_KEY=         # Kimi K2 for classification
GROQ_API_KEY=               # Groq for fast scoring/spam check
OPENAI_API_KEY=             # text-embedding-3-small

# Data
APOLLO_API_KEY=             # Apollo.io for enrichment

# Email
GOOGLE_CLIENT_ID=           # Gmail OAuth
GOOGLE_CLIENT_SECRET=

# Calendar
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=

# Meeting Intelligence
RECALL_AI_API_KEY=          # Recall.ai for recording
DEEPGRAM_API_KEY=           # Deepgram for transcription

# Caching
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Inngest
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=
```

---

## Landing Page

Hero: "Your AI Sales Team. From prospect to close."
Sub: "OutboundAI builds your pipeline, writes your outreach, books your meetings, and manages your deals — so you can focus on closing."

Sections:
1. Hero + CTA (Start free trial)
2. How it works: Connect inbox → Define ICP → AI builds pipeline → Close deals
3. Features grid (6 core systems)
4. Social proof / testimonials (placeholder)
5. Pricing (simple: one tier + usage)
6. FAQ
7. Footer CTA

---

## Build Priority

Build everything. Full product. No corners cut.

Phase 1: Foundation + CRM + TAM Builder
Phase 2: Outreach Engine + Inbox
Phase 3: Meeting Intelligence + Analytics
Phase 4: Landing page + Billing + Onboarding

---

## Key Constraints

- All AI calls must be cost-tracked per workspace (deduct from credits)
- Apollo API responses cached in Redis (24h TTL) to minimize costs
- RLS on every table — workspace isolation is non-negotiable
- Email sending MUST go through user's own Gmail/Outlook (not our domain)
- Unsubscribe link in every outbound email
- Mobile-responsive but desktop-first (sales tools are used on desktop)
