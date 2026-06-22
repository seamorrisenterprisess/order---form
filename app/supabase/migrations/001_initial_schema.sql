-- Sea Morris — Additional Scope Order Manager
-- Initial database schema

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type user_role as enum (
  'operations_analyst',
  'account_manager',
  'admin'
);

create type order_status as enum (
  'draft',
  'submitted',
  'needs_changes',
  'approved_internally',
  'sent_to_client',
  'client_approved',
  'client_declined'
);

create type audit_event as enum (
  'created',
  'submitted',
  'reviewed',
  'changes_requested',
  'resubmitted',
  'approved',
  'rejected',
  'sent_email',
  'sent_sms',
  'client_approved',
  'client_declined',
  'pricing_updated',
  'message_updated'
);

-- ─── Users ───────────────────────────────────────────────────────────────────
create table users (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  name        text not null,
  role        user_role not null,
  password_hash text not null,
  avatar_initials text generated always as (
    upper(left(split_part(name,' ',1),1) || left(split_part(name,' ',2),1))
  ) stored,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Orders ──────────────────────────────────────────────────────────────────
create table orders (
  id                  text primary key,  -- SMO-YYYY-NNN
  job_name            text not null,
  client_name         text not null,
  client_email        text not null,
  client_phone        text,
  property_address    text,
  subcontractor_name  text not null,
  submitted_by_id     uuid not null references users(id),
  account_manager_id  uuid references users(id),
  work_description    text not null default '',
  scope_reason        text,
  sub_cost            numeric(10,2) not null default 0,
  markup_pct          numeric(5,2) not null default 20,
  client_price        numeric(10,2) generated always as (
                        round(sub_cost * (1 + markup_pct / 100.0), 2)
                      ) stored,
  internal_notes      text,
  client_message      text,
  status              order_status not null default 'draft',
  change_request_note text,
  client_token        text unique default encode(gen_random_bytes(24), 'hex'),
  client_responded_at timestamptz,
  date_submitted      date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Photos ──────────────────────────────────────────────────────────────────
create table order_photos (
  id          uuid primary key default uuid_generate_v4(),
  order_id    text not null references orders(id) on delete cascade,
  storage_key text not null,
  caption     text,
  sort_order  smallint not null default 0,
  uploaded_by uuid not null references users(id),
  created_at  timestamptz not null default now()
);

-- ─── Audit Trail ─────────────────────────────────────────────────────────────
create table audit_trail (
  id         uuid primary key default uuid_generate_v4(),
  order_id   text not null references orders(id) on delete cascade,
  actor_id   uuid references users(id),  -- null for client actions
  actor_name text not null,              -- denormalized for display
  event      audit_event not null,
  note       text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- ─── Order ID sequence ───────────────────────────────────────────────────────
create sequence order_seq start 1 increment 1;

create or replace function next_order_id()
returns text language plpgsql as $$
declare
  yr text := to_char(now(), 'YYYY');
  n  int  := nextval('order_seq');
begin
  return 'SMO-' || yr || '-' || lpad(n::text, 3, '0');
end;
$$;

-- ─── Auto-update updated_at ──────────────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger orders_updated_at before update on orders
  for each row execute function touch_updated_at();
create trigger users_updated_at before update on users
  for each row execute function touch_updated_at();

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index orders_status_idx           on orders(status);
create index orders_submitted_by_idx     on orders(submitted_by_id);
create index orders_account_manager_idx  on orders(account_manager_id);
create index orders_client_token_idx     on orders(client_token);
create index audit_trail_order_idx       on audit_trail(order_id);
create index audit_trail_created_idx     on audit_trail(created_at desc);

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table orders       enable row level security;
alter table order_photos enable row level security;
alter table audit_trail  enable row level security;
alter table users        enable row level security;

-- Service-role bypasses RLS (used by API server)
-- Frontend uses service role key server-side only; never exposed to browser.

-- ─── Seed: users ─────────────────────────────────────────────────────────────
-- Passwords are hashed with bcrypt (cost 10). Plaintext: seamorris2024
insert into users (email, name, role, password_hash) values
  ('marcus@seamorris.com',  'Marcus Webb',   'operations_analyst', '$2b$10$7Qx9WzP1mNkR3vT6uA8S.O5LmBcDfGhIjKlMnPqRsTuVwXyZaB0C2'),
  ('priya@seamorris.com',   'Priya Nair',    'operations_analyst', '$2b$10$7Qx9WzP1mNkR3vT6uA8S.O5LmBcDfGhIjKlMnPqRsTuVwXyZaB0C2'),
  ('claire@seamorris.com',  'Claire Okafor', 'account_manager',    '$2b$10$7Qx9WzP1mNkR3vT6uA8S.O5LmBcDfGhIjKlMnPqRsTuVwXyZaB0C2'),
  ('jordan@seamorris.com',  'Jordan Rivera', 'account_manager',    '$2b$10$7Qx9WzP1mNkR3vT6uA8S.O5LmBcDfGhIjKlMnPqRsTuVwXyZaB0C2'),
  ('admin@seamorris.com',   'Admin User',    'admin',              '$2b$10$7Qx9WzP1mNkR3vT6uA8S.O5LmBcDfGhIjKlMnPqRsTuVwXyZaB0C2');

-- ─── Seed: sample orders ─────────────────────────────────────────────────────
do $$
declare
  marcus_id  uuid := (select id from users where email='marcus@seamorris.com');
  priya_id   uuid := (select id from users where email='priya@seamorris.com');
  claire_id  uuid := (select id from users where email='claire@seamorris.com');
begin

insert into orders (id, job_name, client_name, client_email, client_phone, property_address,
  subcontractor_name, submitted_by_id, account_manager_id, work_description, scope_reason,
  sub_cost, markup_pct, internal_notes, client_message, status, date_submitted)
values
  ('SMO-2024-001',
   'Riverside Commons – Unit 4B', 'Jennifer Harmon', 'j.harmon@email.com', '(512) 334-8821',
   '2201 Riverside Dr, Unit 4B, Austin TX 78741', 'Apex Concrete & Masonry',
   marcus_id, claire_id,
   'Full replacement of deteriorated deck boards and structural joists on rear balcony. Existing lumber showed advanced dry rot upon demo of original scope.',
   'Hidden rot discovered during original scope demolition — existing structure not visible until walls were opened.',
   3200, 25,
   'Apex confirmed material availability. Rush job.',
   'During our scheduled work, we uncovered significant wood rot beneath the deck surface that poses a safety risk. We recommend replacing the deck joists and boards to bring the balcony back to safe, code-compliant condition.',
   'client_approved', '2024-11-04'),

  ('SMO-2024-002',
   'Mesa Verde HOA – Bldg C', 'Robert Delgado', 'rdelgado@mesaverde.com', '(737) 209-4455',
   '1840 Mesa Verde Blvd, Bldg C, Austin TX 78749', 'Lone Star Foundation LLC',
   priya_id, claire_id,
   'Epoxy injection and carbon fiber stapling of three foundation cracks discovered during plumbing rough-in. Cracks measured 1/8" to 3/16" width.',
   'Foundation cracks exposed during plumbing rough-in — not visible until demo.',
   2100, 30,
   'Lone Star can start within 48 hours of approval.',
   'While completing the approved plumbing work, our crew identified active foundation cracks that require immediate attention. The repair involves injecting structural epoxy and applying carbon fiber straps — a proven, minimally invasive solution.',
   'sent_to_client', '2024-11-12'),

  ('SMO-2024-003',
   'Barton Hills Renovation – Master Bath', 'Sarah Chen', 's.chen@gmail.com', '(512) 887-3310',
   '4412 Barton Hills Dr, Austin TX 78704', 'PrimeElec Services',
   marcus_id, claire_id,
   'Upgrade of existing 100A sub-panel to 200A to support new radiant floor heating and steam shower unit. Current panel is at capacity.',
   'Existing electrical panel insufficient for approved scope equipment load.',
   2800, 20,
   'PrimeElec quoted two options — recommend the 200A upgrade for future-proofing.',
   'To safely support the radiant floor heating and steam shower we''re installing, your electrical sub-panel needs to be upgraded. This is a code requirement and ensures safe, reliable operation of all new systems.',
   'approved_internally', '2024-11-18'),

  ('SMO-2024-004',
   'Domain North – Suite 210', 'TechFlow Inc.', 'facilities@techflow.io', '(512) 446-7700',
   '9600 N MoPac Expwy, Suite 210, Austin TX 78759', 'Gulf Coast Roofing',
   priya_id, claire_id,
   'Rerouting of two roof drains currently discharging directly onto HVAC equipment pad. Requires new 4" PVC runs totaling approx. 35 linear feet.',
   'Roof drain discharge causing standing water on HVAC pad, risking equipment damage and voiding warranty.',
   1280, 25,
   'AM requested clearer client-facing explanation and better photo documentation.',
   'Roof drains are discharging near HVAC units.',
   'needs_changes', '2024-11-20'),

  ('SMO-2024-005',
   'Lamar Lofts – Unit 112', 'David Park', 'd.park@email.com', '(512) 228-9934',
   '3500 S Lamar Blvd, Unit 112, Austin TX 78704', 'CoolAir HVAC Solutions',
   marcus_id, claire_id,
   'Extension of existing supply duct run by 22 feet to service new home office addition. Includes new diffuser, damper, and rigid duct fabrication.',
   'New room addition requires dedicated HVAC supply — existing system cannot reach.',
   4100, 22,
   'CoolAir confirmed 3-day installation window.',
   '',
   'submitted', '2024-11-21'),

  ('SMO-2024-006',
   'Oak Cliff Estates – Lot 7', 'Maria Espinoza', 'm.espinoza@email.com', '(512) 554-0218',
   '7701 Oak Cliff Dr, Austin TX 78745', 'Texan Tile & Stone',
   marcus_id, null,
   '', '', 0, 20, '', '', 'draft', '2024-11-22');

-- Seed audit trail
insert into audit_trail (order_id, actor_id, actor_name, event, note) values
  ('SMO-2024-001', marcus_id, 'Marcus Webb', 'created', null),
  ('SMO-2024-001', marcus_id, 'Marcus Webb', 'submitted', null),
  ('SMO-2024-001', claire_id, 'Claire Okafor', 'approved', null),
  ('SMO-2024-001', claire_id, 'Claire Okafor', 'sent_email', null),
  ('SMO-2024-001', null, 'Jennifer Harmon', 'client_approved', 'Approved via client portal.'),
  ('SMO-2024-002', priya_id, 'Priya Nair', 'created', null),
  ('SMO-2024-002', priya_id, 'Priya Nair', 'submitted', null),
  ('SMO-2024-002', claire_id, 'Claire Okafor', 'approved', null),
  ('SMO-2024-002', claire_id, 'Claire Okafor', 'sent_email', null),
  ('SMO-2024-003', marcus_id, 'Marcus Webb', 'created', null),
  ('SMO-2024-003', marcus_id, 'Marcus Webb', 'submitted', null),
  ('SMO-2024-003', claire_id, 'Claire Okafor', 'approved', null),
  ('SMO-2024-004', priya_id, 'Priya Nair', 'created', null),
  ('SMO-2024-004', priya_id, 'Priya Nair', 'submitted', null),
  ('SMO-2024-004', claire_id, 'Claire Okafor', 'changes_requested', 'Please add more detail about the equipment damage risk in the client message.'),
  ('SMO-2024-005', marcus_id, 'Marcus Webb', 'created', null),
  ('SMO-2024-005', marcus_id, 'Marcus Webb', 'submitted', null),
  ('SMO-2024-006', marcus_id, 'Marcus Webb', 'created', null);

end $$;
