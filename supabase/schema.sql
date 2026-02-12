-- OutboundAI Database Schema
-- Run this in your Supabase SQL editor

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

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
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member', -- owner, admin, member
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Companies (enriched from Apollo)
create table companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
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
  combined_score numeric generated always as (coalesce(fit_score, 0) * 0.6 + coalesce(intent_score, 0) * 0.4) stored,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
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
  workspace_id uuid references workspaces(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
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
  workspace_id uuid references workspaces(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
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
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  description text,
  status text default 'draft', -- draft, active, paused, completed
  steps jsonb not null default '[]', -- array of {step_number, delay_days, subject_template, body_template, variant}
  settings jsonb, -- send_window, timezone, max_per_day, skip_weekends
  stats jsonb default '{}', -- open_rate, reply_rate, meeting_rate
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sequence Enrollments (contact in a sequence)
create table sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references sequences(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  status text default 'active', -- active, paused, completed, replied, bounced, unsubscribed
  current_step integer default 0,
  next_send_at timestamptz,
  ab_variant text, -- A or B for split testing
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(sequence_id, contact_id)
);

-- Sent Emails
create table sent_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  enrollment_id uuid references sequence_enrollments(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
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

-- Connected Email Accounts
create table email_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
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
  workspace_id uuid references workspaces(id) on delete cascade,
  email text not null,
  reason text, -- bounced, unsubscribed, manual, complaint
  created_at timestamptz default now(),
  unique(workspace_id, email)
);

-- Meetings (from meeting intelligence)
create table meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
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
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  filters jsonb not null, -- industry, size, funding_stage, tech_stack, geography, etc.
  created_at timestamptz default now()
);

-- Indexes
create index idx_companies_workspace on companies(workspace_id);
create index idx_companies_domain on companies(domain);
create index idx_companies_combined_score on companies(workspace_id, combined_score desc);
create index idx_contacts_workspace on contacts(workspace_id);
create index idx_contacts_company on contacts(company_id);
create index idx_contacts_email on contacts(email);
create index idx_deals_workspace on deals(workspace_id);
create index idx_deals_stage on deals(workspace_id, stage);
create index idx_interactions_workspace on interactions(workspace_id);
create index idx_interactions_contact on interactions(contact_id);
create index idx_interactions_created on interactions(workspace_id, created_at desc);
create index idx_sent_emails_workspace on sent_emails(workspace_id);
create index idx_sent_emails_message_id on sent_emails(message_id);
create index idx_sent_emails_thread_id on sent_emails(thread_id);
create index idx_sequence_enrollments_sequence on sequence_enrollments(sequence_id);
create index idx_sequence_enrollments_contact on sequence_enrollments(contact_id);
create index idx_sequence_enrollments_next_send on sequence_enrollments(next_send_at) where status = 'active';

-- Vector similarity search index (for finding similar companies)
create index idx_companies_embedding on companies using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Row Level Security Policies
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table deals enable row level security;
alter table interactions enable row level security;
alter table sequences enable row level security;
alter table sequence_enrollments enable row level security;
alter table sent_emails enable row level security;
alter table email_accounts enable row level security;
alter table suppressions enable row level security;
alter table meetings enable row level security;
alter table icp_presets enable row level security;

-- Helper function to get user's workspace IDs
create or replace function get_user_workspace_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select workspace_id from workspace_members where user_id = auth.uid()
$$;

-- RLS Policies for workspaces
create policy "Users can view workspaces they belong to"
  on workspaces for select
  using (id in (select get_user_workspace_ids()));

create policy "Users can update workspaces they own or admin"
  on workspaces for update
  using (id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));

-- RLS Policies for workspace_members
create policy "Users can view members of their workspaces"
  on workspace_members for select
  using (workspace_id in (select get_user_workspace_ids()));

create policy "Owners and admins can manage members"
  on workspace_members for all
  using (workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));

-- RLS Policies for all workspace-scoped tables
create policy "companies_workspace_isolation" on companies
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "contacts_workspace_isolation" on contacts
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "deals_workspace_isolation" on deals
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "interactions_workspace_isolation" on interactions
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "sequences_workspace_isolation" on sequences
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "sequence_enrollments_workspace_isolation" on sequence_enrollments
  for all using (sequence_id in (
    select id from sequences where workspace_id in (select get_user_workspace_ids())
  ));

create policy "sent_emails_workspace_isolation" on sent_emails
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "email_accounts_workspace_isolation" on email_accounts
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "suppressions_workspace_isolation" on suppressions
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "meetings_workspace_isolation" on meetings
  for all using (workspace_id in (select get_user_workspace_ids()));

create policy "icp_presets_workspace_isolation" on icp_presets
  for all using (workspace_id in (select get_user_workspace_ids()));

-- Function for vector similarity search
create or replace function match_companies(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_workspace_id uuid
)
returns table (
  id uuid,
  name text,
  domain text,
  industry text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    companies.id,
    companies.name,
    companies.domain,
    companies.industry,
    1 - (companies.embedding <=> query_embedding) as similarity
  from companies
  where companies.workspace_id = p_workspace_id
    and companies.embedding is not null
    and 1 - (companies.embedding <=> query_embedding) > match_threshold
  order by companies.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Triggers for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_workspaces_updated_at before update on workspaces
  for each row execute function update_updated_at_column();

create trigger update_companies_updated_at before update on companies
  for each row execute function update_updated_at_column();

create trigger update_contacts_updated_at before update on contacts
  for each row execute function update_updated_at_column();

create trigger update_deals_updated_at before update on deals
  for each row execute function update_updated_at_column();

create trigger update_sequences_updated_at before update on sequences
  for each row execute function update_updated_at_column();

create trigger update_sequence_enrollments_updated_at before update on sequence_enrollments
  for each row execute function update_updated_at_column();

-- Function to create a workspace for a new user
create or replace function handle_new_user()
returns trigger as $$
declare
  new_workspace_id uuid;
begin
  -- Create a default workspace for the new user
  insert into workspaces (name, domain)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Workspace',
    split_part(new.email, '@', 2)
  )
  returning id into new_workspace_id;

  -- Add the user as owner of the workspace
  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create workspace on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
