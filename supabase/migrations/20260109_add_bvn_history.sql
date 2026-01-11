-- Create bvn_history table for BVN verification tracking
create table if not exists public.bvn_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  bvn text not null,
  verification_type text not null, -- 'basic' or 'advance'
  status text not null,
  result jsonb,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.bvn_history enable row level security;

-- Users can read their own BVN history
create policy "Users can view own BVN history"
  on public.bvn_history
  for select
  using (auth.uid() = user_id);

-- Users can insert their own BVN history
create policy "Users can insert own BVN history"
  on public.bvn_history
  for insert
  with check (auth.uid() = user_id);

-- Create index for better query performance
create index if not exists bvn_history_user_id_created_at_idx 
  on public.bvn_history(user_id, created_at desc);

create index if not exists bvn_history_bvn_idx 
  on public.bvn_history(bvn);
