-- Create api_usage table for detailed API tracking
create table if not exists public.api_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  action text not null,
  status text not null,
  response_time integer, -- in milliseconds
  error_message text,
  request_metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.api_usage enable row level security;

-- Users can read their own API usage
create policy "Users can view own API usage"
  on public.api_usage
  for select
  using (auth.uid() = user_id);

-- Users can insert their own API usage
create policy "Users can insert own API usage"
  on public.api_usage
  for insert
  with check (auth.uid() = user_id);

-- Create index for better query performance
create index if not exists api_usage_user_id_created_at_idx 
  on public.api_usage(user_id, created_at desc);

create index if not exists api_usage_endpoint_idx 
  on public.api_usage(endpoint);

create index if not exists api_usage_action_idx 
  on public.api_usage(action);
