-- =============================================================================
-- schema.sql — run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Creates all 7 tables the Ledger app needs, and opens them up to the
-- app's anon/public API key so the browser can read and write directly.
-- =============================================================================

create table if not exists main_mappings (
  code        integer primary key,
  name        text not null,
  nature_code integer not null
);

create table if not exists sub_mappings (
  code      integer primary key,
  name      text not null,
  main_code integer not null references main_mappings(code) on delete restrict
);

create table if not exists accounts (
  code        text primary key,
  title       text not null,
  pl          text default '',
  bs          text default '',
  nature_code integer not null,
  nature      text not null,
  main_code   integer not null references main_mappings(code) on delete restrict,
  main        text not null,
  sub_code    integer not null references sub_mappings(code) on delete restrict,
  sub         text not null
);

create table if not exists customers (
  code         text primary key,
  name         text not null,
  account_code text references accounts(code) on delete set null
);

create table if not exists suppliers (
  code         text primary key,
  name         text not null,
  account_code text references accounts(code) on delete set null
);

create table if not exists vouchers (
  id        text primary key,           -- e.g. JV-AUG-26-01
  date      date not null,
  narration text default ''
);

create table if not exists voucher_lines (
  id            bigint generated always as identity primary key,
  voucher_id    text not null references vouchers(id) on delete cascade,
  account_code  text not null,
  account_title text default '',
  description   text default '',
  debit         numeric(14,2) default 0,
  credit        numeric(14,2) default 0,
  line_order    integer default 0
);

-- ---- seed the two fixed lookup tables (safe to re-run) ---------------------
insert into main_mappings (code, name, nature_code) values
  (1,'Accounts Receivable',1),(2,'Advance Taxes',1),(3,'Cash & Bank',1),
  (4,'Employee Receivables',1),(5,'Property, plant and equipment',1),
  (6,'Security Deposits',1),(7,'Issued & Sub Capital',2),
  (8,'Unappropriated Profit / Loss',2),(9,'Employee Payables',3),
  (10,'Taxtion',3),(11,'Trade and Other Payables',3),(12,'Other Income',4),
  (13,'Revenue',4),(14,'Administrative Expenses',5),(15,'Cost of Service',5),
  (16,'Depreciation Expense',5),(17,'Finance Cost',5)
on conflict (code) do nothing;

-- (Import your full accounts / sub_mappings / customers / suppliers /
--  vouchers data separately — e.g. via the Table Editor's CSV import, or by
--  connecting the app once and re-entering records through its own forms.)

-- =============================================================================
-- Row Level Security — required by Supabase before anon reads/writes work.
-- These policies are fully open (any anon-key holder can read/write
-- everything), matching this app's current no-login design. Tighten these
-- (e.g. require auth.uid()) before using this with real, sensitive data.
-- =============================================================================
alter table main_mappings enable row level security;
alter table sub_mappings  enable row level security;
alter table accounts      enable row level security;
alter table customers     enable row level security;
alter table suppliers     enable row level security;
alter table vouchers      enable row level security;
alter table voucher_lines enable row level security;

create policy "anon full access" on main_mappings for all using (true) with check (true);
create policy "anon full access" on sub_mappings  for all using (true) with check (true);
create policy "anon full access" on accounts      for all using (true) with check (true);
create policy "anon full access" on customers     for all using (true) with check (true);
create policy "anon full access" on suppliers     for all using (true) with check (true);
create policy "anon full access" on vouchers      for all using (true) with check (true);
create policy "anon full access" on voucher_lines for all using (true) with check (true);

-- ---- enable realtime so changes push to every open browser tab -------------
alter publication supabase_realtime add table main_mappings;
alter publication supabase_realtime add table sub_mappings;
alter publication supabase_realtime add table accounts;
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table suppliers;
alter publication supabase_realtime add table vouchers;
alter publication supabase_realtime add table voucher_lines;
