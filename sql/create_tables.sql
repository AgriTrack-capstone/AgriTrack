-- Create crops table
create table if not exists crops (
  id bigserial primary key,
  name text not null,
  field text,
  stock_amt numeric default 0,
  stock_unit text,
  color text,
  created_at timestamptz default now()
);

alter table if exists crops enable row level security;

grant usage, select on all sequences in schema public to anon, authenticated;
grant select, insert, update, delete on table crops to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crops'
      and policyname = 'Allow anon full access to crops'
  ) then
    create policy "Allow anon full access to crops"
      on crops
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end
$$;

-- Create records table
create table if not exists records (
  id bigserial primary key,
  title text not null,
  crop text,
  field text,
  qty_amount numeric,
  qty_unit text,
  schedule_at timestamptz,
  notes text,
  status text,
  created_at timestamptz default now()
);

alter table if exists records enable row level security;

grant select, insert, update, delete on table records to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'records'
      and policyname = 'Allow anon full access to records'
  ) then
    create policy "Allow anon full access to records"
      on records
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end
$$;

-- Create accounts table for login and account management
create table if not exists accounts (
  id bigserial primary key,
  full_name text not null,
  username text not null unique,
  email text not null unique,
  password text not null,
  role text not null default 'Farm Worker',
  status text not null default 'Active',
  created_at timestamptz default now()
);

alter table if exists accounts enable row level security;

grant usage, select on all sequences in schema public to anon, authenticated;
grant select, insert, update, delete on table accounts to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'Allow anon full access to accounts'
  ) then
    create policy "Allow anon full access to accounts"
      on accounts
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end
$$;

-- Seed initial accounts if missing
insert into accounts (full_name, username, email, password, role)
select 'Angela Mae G.', 'angela', 'angela@agritrack.local', 'farm123', 'Admin'
where not exists (select 1 from accounts where username = 'angela');

insert into accounts (full_name, username, email, password, role)
select 'Juan Dela Cruz', 'juan', 'juan@agritrack.local', 'juan123', 'Farm Worker'
where not exists (select 1 from accounts where username = 'juan');
