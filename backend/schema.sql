-- ============================================================
-- GOLF CHARITY SUBSCRIPTION PLATFORM — SUPABASE SQL SCHEMA
-- ============================================================
-- Run this ENTIRE file in Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: users
-- ============================================================
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text default 'user' check (role in ('user', 'admin')),
  charity_id uuid,
  charity_percentage integer default 10 check (charity_percentage >= 10 and charity_percentage <= 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLE: charities
-- ============================================================
create table if not exists charities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  image_url text,
  website text,
  category text default 'general',
  is_featured boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_charity' AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_charity
      FOREIGN KEY (charity_id) REFERENCES charities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- TABLE: charity_events
-- ============================================================
create table if not exists charity_events (
  id uuid primary key default uuid_generate_v4(),
  charity_id uuid references charities(id) on delete cascade,
  title text not null,
  description text,
  event_date date not null,
  location text,
  registration_url text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE: subscriptions
-- Uses Razorpay — razorpay_order_id + razorpay_payment_id
-- ============================================================
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text unique,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text default 'active' check (status in ('active', 'lapsed', 'cancelling', 'cancelled')),
  prize_contribution integer default 0,
  charity_contribution integer default 0,
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLE: scores (5-score rolling window per PRD)
-- ============================================================
create table if not exists scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 45),
  played_on date not null,
  edited_by_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLE: draws
-- ============================================================
create table if not exists draws (
  id uuid primary key default uuid_generate_v4(),
  name text,
  draw_date date not null,
  draw_numbers integer[],
  draw_type text default 'random' check (draw_type in ('random', 'algorithmic')),
  status text default 'scheduled' check (status in ('scheduled', 'open', 'published', 'cancelled')),
  total_pool integer default 0,
  five_match_pool integer default 0,
  four_match_pool integer default 0,
  three_match_pool integer default 0,
  jackpot_rollover integer default 0,
  total_participants integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE: draw_entries
-- ============================================================
create table if not exists draw_entries (
  id uuid primary key default uuid_generate_v4(),
  draw_id uuid references draws(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  scores_snapshot jsonb,
  created_at timestamptz default now(),
  unique(draw_id, user_id)
);

-- ============================================================
-- TABLE: winners
-- ============================================================
create table if not exists winners (
  id uuid primary key default uuid_generate_v4(),
  draw_id uuid references draws(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  match_type text not null check (match_type in ('5_match', '4_match', '3_match')),
  match_count integer not null,
  prize_amount integer not null,
  status text default 'pending' check (status in ('pending', 'verification_pending', 'verified', 'rejected', 'paid')),
  proof_url text,
  proof_notes text,
  rejection_reason text,
  proof_submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references users(id),
  paid_at timestamptz,
  paid_by uuid references users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE: donations
-- ============================================================
create table if not exists donations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  charity_id uuid references charities(id) on delete cascade,
  amount integer not null,
  message text,
  type text default 'subscription' check (type in ('subscription', 'independent')),
  status text default 'completed',
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_scores_user_id on scores(user_id);
create index if not exists idx_scores_played_on on scores(played_on desc);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_status on subscriptions(status);
create index if not exists idx_winners_user_id on winners(user_id);
create index if not exists idx_winners_status on winners(status);
create index if not exists idx_draws_status on draws(status);
create index if not exists idx_draw_entries_draw_id on draw_entries(draw_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table users enable row level security;
alter table scores enable row level security;
alter table subscriptions enable row level security;
alter table winners enable row level security;
alter table donations enable row level security;
alter table draw_entries enable row level security;
alter table charity_events enable row level security;
alter table charities enable row level security;
alter table draws enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own scores' AND tablename = 'scores') THEN
    CREATE POLICY "Users manage own scores" ON scores FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Users view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own winnings' AND tablename = 'winners') THEN
    CREATE POLICY "Users view own winnings" ON winners FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Charities are public' AND tablename = 'charities') THEN
    CREATE POLICY "Charities are public" ON charities FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Charity events are public' AND tablename = 'charity_events') THEN
    CREATE POLICY "Charity events are public" ON charity_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Published draws are public' AND tablename = 'draws') THEN
    CREATE POLICY "Published draws are public" ON draws FOR SELECT USING (status IN ('published','scheduled','open'));
  END IF;
END $$;

-- ============================================================
-- SEED DATA: Sample charities
-- ============================================================
insert into charities (name, description, category, is_featured, is_active)
select * from (values
  ('Cancer Research UK', 'Dedicated to saving lives by preventing, controlling and curing cancer through world-class research.', 'health', true, true),
  ('British Heart Foundation', 'Fighting heart and circulatory disease through ground-breaking research, information and support.', 'health', false, true),
  ('Macmillan Cancer Support', 'Providing medical, emotional, practical and financial support to those living with cancer.', 'health', false, true),
  ('RSPCA', 'Rescuing, rehabilitating and rehoming animals who are in need of help across England and Wales.', 'animals', false, true),
  ('Age UK', 'Helping older people live their later life with dignity, meaning and purpose.', 'elderly', false, true),
  ('Golf Foundation', 'Introducing young people to golf and supporting their development through the game.', 'sport', false, true)
) as v(name, description, category, is_featured, is_active)
where not exists (select 1 from charities where charities.name = v.name);

-- ============================================================
-- MIGRATION: If upgrading from Stripe — run these safely
-- ============================================================
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_stripe_subscription_id_key;

-- ============================================================
-- DONE
-- ============================================================
