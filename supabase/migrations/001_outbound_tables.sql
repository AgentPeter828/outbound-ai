-- Outbound tables for Firestorm portfolio businesses
-- All tables have business_slug for cross-app filtering

create table if not exists outbound_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_slug text not null,
  name text not null,
  icp_criteria jsonb default '{}',
  sequences jsonb default '[]',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists outbound_prospects (
  id uuid primary key default gen_random_uuid(),
  business_slug text not null,
  campaign_id uuid references outbound_campaigns(id) on delete set null,
  first_name text,
  last_name text,
  email text,
  company text,
  title text,
  linkedin_url text,
  lead_score integer default 0,
  status text not null default 'new' check (status in ('new', 'contacted', 'engaged', 'qualified', 'disqualified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists outbound_emails (
  id uuid primary key default gen_random_uuid(),
  business_slug text not null,
  prospect_id uuid references outbound_prospects(id) on delete cascade,
  campaign_id uuid references outbound_campaigns(id) on delete set null,
  subject text,
  body text,
  status text not null default 'draft' check (status in ('draft', 'queued', 'sent', 'delivered', 'bounced', 'failed')),
  opened boolean not null default false,
  replied boolean not null default false,
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists outbound_meetings (
  id uuid primary key default gen_random_uuid(),
  business_slug text not null,
  prospect_id uuid references outbound_prospects(id) on delete cascade,
  scheduled_at timestamptz,
  notes text,
  outcome text check (outcome in ('completed', 'no_show', 'rescheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists outbound_deals (
  id uuid primary key default gen_random_uuid(),
  business_slug text not null,
  prospect_id uuid references outbound_prospects(id) on delete cascade,
  title text,
  stage text not null default 'qualification' check (stage in ('qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  value numeric default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for business_slug filtering
create index if not exists idx_outbound_campaigns_slug on outbound_campaigns(business_slug);
create index if not exists idx_outbound_prospects_slug on outbound_prospects(business_slug);
create index if not exists idx_outbound_emails_slug on outbound_emails(business_slug);
create index if not exists idx_outbound_meetings_slug on outbound_meetings(business_slug);
create index if not exists idx_outbound_deals_slug on outbound_deals(business_slug);
