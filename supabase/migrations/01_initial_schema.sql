-- Create a table for projects
create table projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Project State JSON
  -- Instead of separate columns for every field, we can store the state as JSONB for flexibility
  -- or we can map them out. Given the complexity, JSONB is often easier for rapid prototyping.
  -- But for "Real World", typed columns are better. Let's do a hybrid or just columns.
  -- Let's stick to JSONB for the 'state' to allow the frontend to evolve without migration hell for now.
  data jsonb not null
);

-- Enable RLS
alter table projects enable row level security;

-- Policies
create policy "Users can view their own projects" on projects
  for select using (auth.uid() = user_id);

create policy "Users can insert their own projects" on projects
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own projects" on projects
  for update using (auth.uid() = user_id);

create policy "Users can delete their own projects" on projects
  for delete using (auth.uid() = user_id);
