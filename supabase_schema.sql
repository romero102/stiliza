-- STILIZA SCHEMA - Ejecutar en Supabase SQL Editor
create extension if not exists "uuid-ossp";

drop table if exists public.contact_messages cascade;
drop table if exists public.reservation_items cascade;
drop table if exists public.reservations cascade;
drop table if exists public.promotions cascade;
drop table if exists public.products cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text not null default 'cliente' check (role in ('cliente', 'empleado', 'dueno')),
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text default '',
  material text default '',
  category text not null check (category in ('gala', 'casual', 'fiesta', 'boda', 'quinceañera')),
  price numeric(12,2) not null check (price >= 0),
  image_url text default '',
  sizes text[] default array['S','M','L'],
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.promotions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text default '',
  discount_percent integer default 0,
  discount_label text default '',
  original_price numeric(12,2) default 0,
  category text default '',
  end_date date,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

create table public.reservations (
  id uuid default uuid_generate_v4() primary key,
  reservation_number text unique not null,
  customer_name text not null,
  customer_email text default '',
  customer_phone text default '',
  total_amount numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null default 0,
  payment_method text default 'tarjeta' check (payment_method in ('tarjeta', 'qr', 'efectivo', 'transferencia')),
  payment_status text default 'pagado' check (payment_status in ('pendiente', 'pagado', 'cancelado')),
  pickup_status text default 'pendiente' check (pickup_status in ('pendiente', 'recogido', 'expirado', 'vendido')),
  tipo text default 'reserva' check (tipo in ('reserva', 'venta_tienda')),
  pickup_deadline date,
  notes text default '',
  employee_id uuid references public.profiles(id),
  employee_email text default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.reservation_items (
  id uuid default uuid_generate_v4() primary key,
  reservation_id uuid references public.reservations(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text default 'M',
  unit_price numeric(12,2) not null default 0,
  quantity integer not null default 1,
  subtotal numeric(12,2) not null default 0
);

create table public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  phone text default '',
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'cliente')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.promotions enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.contact_messages enable row level security;

create policy "profiles_select" on public.profiles for select using (auth.uid() = id or public.current_role() in ('dueno','empleado'));
create policy "profiles_update" on public.profiles for update using (auth.uid() = id or public.current_role() = 'dueno');
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id or public.current_role() = 'dueno');

create policy "products_read" on public.products for select using (is_active = true or public.current_role() = 'dueno');
create policy "products_write" on public.products for all using (public.current_role() = 'dueno');

create policy "promos_read" on public.promotions for select using (is_active = true or public.current_role() = 'dueno');
create policy "promos_write" on public.promotions for all using (public.current_role() = 'dueno');

create policy "res_insert" on public.reservations for insert with check (true);
create policy "res_select" on public.reservations for select using (public.current_role() in ('dueno','empleado') or created_by = auth.uid());
create policy "res_update" on public.reservations for update using (public.current_role() in ('dueno','empleado'));
create policy "res_delete" on public.reservations for delete using (public.current_role() = 'dueno');

create policy "items_insert" on public.reservation_items for insert with check (true);
create policy "items_select" on public.reservation_items for select using (public.current_role() in ('dueno','empleado'));
create policy "items_all" on public.reservation_items for all using (public.current_role() = 'dueno');

create policy "msg_insert" on public.contact_messages for insert with check (true);
create policy "msg_select" on public.contact_messages for select using (public.current_role() = 'dueno');
create policy "msg_update" on public.contact_messages for update using (public.current_role() = 'dueno');

insert into public.products (name, description, material, category, price, sizes) values
('Vestido Gala Rubí Nocturno', 'Elegante vestido sirena en tono vino.', 'Tul, satén y pedrería', 'gala', 615, array['XS','S','M','L','XL']),
('Vestido Gala Lavanda Crystal', 'Vestido sirena lavanda con pedrería.', 'Satén, tul y cristales', 'gala', 560, array['S','M','L','XL']),
('Vestido Floral Elegance', 'Vestido corto con detalles florales.', 'Algodón y gasa', 'casual', 495, array['XS','S','M','L']),
('Vestido Pink Elegance', 'Vestido corto de satén rosa empolvado.', 'Satén', 'fiesta', 655, array['XS','S','M','L']),
('Vestido de Novia Imperial Crystal', 'Corte sirena con pedrería y cola.', 'Encaje, tul y cristales', 'boda', 1850, array['S','M','L','XL']),
('Vestido Royal Ruby', 'Quinceañera rojo intenso.', 'Tul, satén y brillos', 'quinceañera', 1650, array['XS','S','M','L','XL']);

-- Crear dueño: Authentication → Add user (dueno@stiliza.com + password)
-- Luego:
-- update public.profiles set role = 'dueno', full_name = 'Dueño Stiliza' where email = 'dueno@stiliza.com';
