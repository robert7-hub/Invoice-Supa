create extension if not exists "pgcrypto";

create table if not exists public.business_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_name text not null default '',
  business_number text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  bank_name text not null default '',
  account_number text not null default '',
  account_type text not null default '',
  branch_code text not null default '',
  branch_name text not null default '',
  swift_code text not null default '',
  tax_rate numeric(10,2) not null default 0,
  tax_label text not null default 'VAT',
  custom_block_1 text not null default '',
  custom_block_2 text not null default '',
  default_invoice_notes text not null default '',
  default_estimate_notes text not null default '',
  next_invoice_number text not null default '00000',
  next_estimate_number text not null default '00000',
  logo text,
  app_theme text not null default 'default',
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  postal_code text not null default '',
  vat_number text not null default '',
  extra_line1 text not null default '',
  extra_line2 text not null default '',
  extra_line3 text not null default '',
  extra_line4 text not null default '',
  extra_line5 text not null default '',
  notes text not null default '',
  created_at date,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists clients_user_id_idx on public.clients (user_id);

create table if not exists public.items (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null default '',
  description text not null default '',
  unit_cost numeric(12,2) not null default 0,
  unit text not null default '',
  quantity numeric(12,2) not null default 1,
  discount_type text not null default 'percentage',
  discount_amount numeric(12,2) not null default 0,
  taxable boolean not null default true,
  additional_details text not null default '',
  created_at date,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists items_user_id_idx on public.items (user_id);

create table if not exists public.invoices (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  client_id text,
  number text not null,
  invoice_date date,
  due_date date,
  status text not null default 'outstanding' check (status in ('outstanding', 'paid')),
  amount_paid numeric(12,2) not null default 0,
  notes text not null default '',
  overall_discount numeric(12,2) not null default 0,
  overall_discount_type text not null default 'percentage',
  created_at date,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, number)
);

create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_client_id_idx on public.invoices (client_id);

create table if not exists public.invoice_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  invoice_id text not null,
  position integer not null default 0,
  description text not null default '',
  notes text not null default '',
  rate numeric(12,2) not null default 0,
  qty numeric(12,2) not null default 1,
  unit text not null default '',
  discount_type text not null default 'percentage',
  discount_amount numeric(12,2) not null default 0,
  taxable boolean not null default true,
  primary key (user_id, id),
  constraint invoice_items_invoice_fk
    foreign key (user_id, invoice_id)
    references public.invoices (user_id, id)
    on delete cascade
);

create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id, position);

create table if not exists public.estimates (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  client_id text,
  number text not null,
  estimate_date date,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  notes text not null default '',
  overall_discount numeric(12,2) not null default 0,
  overall_discount_type text not null default 'percentage',
  created_at date,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, number)
);

create index if not exists estimates_user_id_idx on public.estimates (user_id);
create index if not exists estimates_client_id_idx on public.estimates (client_id);

create table if not exists public.estimate_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  estimate_id text not null,
  position integer not null default 0,
  description text not null default '',
  notes text not null default '',
  rate numeric(12,2) not null default 0,
  qty numeric(12,2) not null default 1,
  unit text not null default '',
  discount_type text not null default 'percentage',
  discount_amount numeric(12,2) not null default 0,
  taxable boolean not null default true,
  primary key (user_id, id),
  constraint estimate_items_estimate_fk
    foreign key (user_id, estimate_id)
    references public.estimates (user_id, id)
    on delete cascade
);

create index if not exists estimate_items_estimate_id_idx on public.estimate_items (estimate_id, position);

alter table public.business_settings enable row level security;
alter table public.clients enable row level security;
alter table public.items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;

drop policy if exists "Users manage own business_settings" on public.business_settings;
create policy "Users manage own business_settings"
on public.business_settings
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own clients" on public.clients;
create policy "Users manage own clients"
on public.clients
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own items" on public.items;
create policy "Users manage own items"
on public.items
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own invoices" on public.invoices;
create policy "Users manage own invoices"
on public.invoices
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own invoice_items" on public.invoice_items;
create policy "Users manage own invoice_items"
on public.invoice_items
for all
to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);

drop policy if exists "Users manage own estimates" on public.estimates;
create policy "Users manage own estimates"
on public.estimates
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own estimate_items" on public.estimate_items;
create policy "Users manage own estimate_items"
on public.estimate_items
for all
to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);

create or replace view public.invoice_report_view as
select
  i.id,
  i.user_id,
  i.number,
  i.invoice_date,
  i.due_date,
  i.status,
  i.amount_paid,
  i.client_id,
  c.name as client_name,
  coalesce(sum(
    (
      greatest(ii.rate * ii.qty - case
        when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
        else ii.discount_amount
      end, 0)
    ) + case
      when ii.taxable then greatest(ii.rate * ii.qty - case
        when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
        else ii.discount_amount
      end, 0) * (bs.tax_rate / 100)
      else 0
    end
  ), 0) as line_total
from public.invoices i
left join public.clients c on c.user_id = i.user_id and c.id = i.client_id
left join public.business_settings bs on bs.user_id = i.user_id
left join public.invoice_items ii on ii.user_id = i.user_id and ii.invoice_id = i.id
group by
  i.id,
  i.user_id,
  i.number,
  i.invoice_date,
  i.due_date,
  i.status,
  i.amount_paid,
  i.client_id,
  c.name,
  bs.tax_rate;

create or replace view public.estimate_report_view as
select
  e.id,
  e.user_id,
  e.number,
  e.estimate_date,
  e.status,
  e.client_id,
  c.name as client_name,
  coalesce(sum(
    (
      greatest(ei.rate * ei.qty - case
        when ei.discount_type = 'percentage' then (ei.rate * ei.qty) * (ei.discount_amount / 100)
        else ei.discount_amount
      end, 0)
    ) + case
      when ei.taxable then greatest(ei.rate * ei.qty - case
        when ei.discount_type = 'percentage' then (ei.rate * ei.qty) * (ei.discount_amount / 100)
        else ei.discount_amount
      end, 0) * (bs.tax_rate / 100)
      else 0
    end
  ), 0) as line_total
from public.estimates e
left join public.clients c on c.user_id = e.user_id and c.id = e.client_id
left join public.business_settings bs on bs.user_id = e.user_id
left join public.estimate_items ei on ei.user_id = e.user_id and ei.estimate_id = e.id
group by
  e.id,
  e.user_id,
  e.number,
  e.estimate_date,
  e.status,
  e.client_id,
  c.name,
  bs.tax_rate;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'app_state'
  ) then
    insert into public.business_settings (
      user_id,
      business_name,
      business_number,
      address,
      phone,
      email,
      bank_name,
      account_number,
      account_type,
      branch_code,
      branch_name,
      swift_code,
      tax_rate,
      tax_label,
      custom_block_1,
      custom_block_2,
      default_invoice_notes,
      default_estimate_notes,
      next_invoice_number,
      next_estimate_number,
      logo,
      app_theme,
      updated_at
    )
    select
      a.user_id,
      coalesce(a.settings ->> 'businessName', ''),
      coalesce(a.settings ->> 'businessNumber', ''),
      coalesce(a.settings ->> 'address', ''),
      coalesce(a.settings ->> 'phone', ''),
      coalesce(a.settings ->> 'email', ''),
      coalesce(a.settings ->> 'bankName', ''),
      coalesce(a.settings ->> 'accountNumber', ''),
      coalesce(a.settings ->> 'accountType', ''),
      coalesce(a.settings ->> 'branchCode', ''),
      coalesce(a.settings ->> 'branchName', ''),
      coalesce(a.settings ->> 'swiftCode', ''),
      coalesce((a.settings ->> 'taxRate')::numeric, 0),
      coalesce(a.settings ->> 'taxLabel', 'VAT'),
      coalesce(a.settings ->> 'customBlock1', ''),
      coalesce(a.settings ->> 'customBlock2', ''),
      coalesce(a.settings ->> 'defaultInvoiceNotes', ''),
      coalesce(a.settings ->> 'defaultEstimateNotes', ''),
      coalesce(regexp_replace(a.settings ->> 'nextInvoiceNumber', '\D', '', 'g'), '00000'),
      coalesce(regexp_replace(a.settings ->> 'nextEstimateNumber', '\D', '', 'g'), '00000'),
      a.settings ->> 'logo',
      coalesce(a.settings ->> 'appTheme', 'default'),
      a.updated_at
    from public.app_state a
    on conflict (user_id) do update
      set business_name = excluded.business_name,
          business_number = excluded.business_number,
          address = excluded.address,
          phone = excluded.phone,
          email = excluded.email,
          bank_name = excluded.bank_name,
          account_number = excluded.account_number,
          account_type = excluded.account_type,
          branch_code = excluded.branch_code,
          branch_name = excluded.branch_name,
          swift_code = excluded.swift_code,
          tax_rate = excluded.tax_rate,
          tax_label = excluded.tax_label,
          custom_block_1 = excluded.custom_block_1,
          custom_block_2 = excluded.custom_block_2,
          default_invoice_notes = excluded.default_invoice_notes,
          default_estimate_notes = excluded.default_estimate_notes,
          next_invoice_number = excluded.next_invoice_number,
          next_estimate_number = excluded.next_estimate_number,
          logo = excluded.logo,
          app_theme = excluded.app_theme,
          updated_at = excluded.updated_at;

    insert into public.clients (
      id,
      user_id,
      name,
      phone,
      email,
      address_line1,
      address_line2,
      city,
      postal_code,
      vat_number,
      extra_line1,
      extra_line2,
      extra_line3,
      extra_line4,
      extra_line5,
      notes,
      created_at,
      updated_at
    )
    select
      client.value ->> 'id',
      a.user_id,
      coalesce(client.value ->> 'name', ''),
      coalesce(client.value ->> 'phone', ''),
      coalesce(client.value ->> 'email', ''),
      coalesce(client.value ->> 'addressLine1', ''),
      coalesce(client.value ->> 'addressLine2', ''),
      coalesce(client.value ->> 'city', ''),
      coalesce(client.value ->> 'postalCode', ''),
      coalesce(client.value ->> 'vatNumber', ''),
      coalesce(client.value ->> 'extraLine1', ''),
      coalesce(client.value ->> 'extraLine2', ''),
      coalesce(client.value ->> 'extraLine3', ''),
      coalesce(client.value ->> 'extraLine4', ''),
      coalesce(client.value ->> 'extraLine5', ''),
      coalesce(client.value ->> 'notes', ''),
      nullif(client.value ->> 'createdAt', '')::date,
      a.updated_at
    from public.app_state a
    cross join lateral jsonb_array_elements(coalesce(a.clients, '[]'::jsonb)) client(value)
    on conflict (user_id, id) do update
      set user_id = excluded.user_id,
          name = excluded.name,
          phone = excluded.phone,
          email = excluded.email,
          address_line1 = excluded.address_line1,
          address_line2 = excluded.address_line2,
          city = excluded.city,
          postal_code = excluded.postal_code,
          vat_number = excluded.vat_number,
          extra_line1 = excluded.extra_line1,
          extra_line2 = excluded.extra_line2,
          extra_line3 = excluded.extra_line3,
          extra_line4 = excluded.extra_line4,
          extra_line5 = excluded.extra_line5,
          notes = excluded.notes,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at;

    insert into public.items (
      id,
      user_id,
      name,
      description,
      unit_cost,
      unit,
      quantity,
      discount_type,
      discount_amount,
      taxable,
      additional_details,
      updated_at
    )
    select
      item.value ->> 'id',
      a.user_id,
      coalesce(item.value ->> 'name', ''),
      coalesce(item.value ->> 'description', ''),
      coalesce((item.value ->> 'unitCost')::numeric, 0),
      coalesce(item.value ->> 'unit', ''),
      coalesce((item.value ->> 'quantity')::numeric, 1),
      coalesce(item.value ->> 'discountType', 'percentage'),
      coalesce((item.value ->> 'discountAmount')::numeric, 0),
      coalesce((item.value ->> 'taxable')::boolean, true),
      coalesce(item.value ->> 'additionalDetails', ''),
      a.updated_at
    from public.app_state a
    cross join lateral jsonb_array_elements(coalesce(a.items, '[]'::jsonb)) item(value)
    on conflict (user_id, id) do update
      set user_id = excluded.user_id,
          name = excluded.name,
          description = excluded.description,
          unit_cost = excluded.unit_cost,
          unit = excluded.unit,
          quantity = excluded.quantity,
          discount_type = excluded.discount_type,
          discount_amount = excluded.discount_amount,
          taxable = excluded.taxable,
          additional_details = excluded.additional_details,
          updated_at = excluded.updated_at;

    insert into public.invoices (
      id,
      user_id,
      client_id,
      number,
      invoice_date,
      due_date,
      status,
      amount_paid,
      notes,
      overall_discount,
      overall_discount_type,
      created_at,
      updated_at
    )
    select
      invoice.value ->> 'id',
      a.user_id,
      nullif(invoice.value ->> 'clientId', ''),
      coalesce(invoice.value ->> 'number', ''),
      nullif(invoice.value ->> 'date', '')::date,
      nullif(invoice.value ->> 'dueDate', '')::date,
      coalesce(invoice.value ->> 'status', 'outstanding'),
      coalesce((invoice.value ->> 'amountPaid')::numeric, 0),
      coalesce(invoice.value ->> 'notes', ''),
      coalesce((invoice.value ->> 'overallDiscount')::numeric, 0),
      coalesce(invoice.value ->> 'overallDiscountType', 'percentage'),
      nullif(invoice.value ->> 'createdAt', '')::date,
      a.updated_at
    from public.app_state a
    cross join lateral jsonb_array_elements(coalesce(a.invoices, '[]'::jsonb)) invoice(value)
    on conflict (user_id, id) do update
      set user_id = excluded.user_id,
          client_id = excluded.client_id,
          number = excluded.number,
          invoice_date = excluded.invoice_date,
          due_date = excluded.due_date,
          status = excluded.status,
          amount_paid = excluded.amount_paid,
          notes = excluded.notes,
          overall_discount = excluded.overall_discount,
          overall_discount_type = excluded.overall_discount_type,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at;

    insert into public.invoice_items (
      user_id,
      id,
      invoice_id,
      position,
      description,
      notes,
      rate,
      qty,
      unit,
      discount_type,
      discount_amount,
      taxable
    )
    select
      a.user_id,
      line_item.value ->> 'id',
      invoice.value ->> 'id',
      line_item.ordinality - 1,
      coalesce(line_item.value ->> 'description', ''),
      coalesce(line_item.value ->> 'notes', ''),
      coalesce((line_item.value ->> 'rate')::numeric, 0),
      coalesce((line_item.value ->> 'qty')::numeric, 1),
      coalesce(line_item.value ->> 'unit', ''),
      coalesce(line_item.value ->> 'discountType', 'percentage'),
      coalesce((line_item.value ->> 'discountAmount')::numeric, 0),
      coalesce((line_item.value ->> 'taxable')::boolean, true)
    from public.app_state a
    cross join lateral jsonb_array_elements(coalesce(a.invoices, '[]'::jsonb)) invoice(value)
    cross join lateral jsonb_array_elements(coalesce(invoice.value -> 'items', '[]'::jsonb)) with ordinality line_item(value, ordinality)
    on conflict (user_id, id) do update
      set invoice_id = excluded.invoice_id,
          position = excluded.position,
          description = excluded.description,
          notes = excluded.notes,
          rate = excluded.rate,
          qty = excluded.qty,
          unit = excluded.unit,
          discount_type = excluded.discount_type,
          discount_amount = excluded.discount_amount,
          taxable = excluded.taxable;

    insert into public.estimates (
      id,
      user_id,
      client_id,
      number,
      estimate_date,
      status,
      notes,
      overall_discount,
      overall_discount_type,
      created_at,
      updated_at
    )
    select
      estimate.value ->> 'id',
      a.user_id,
      nullif(estimate.value ->> 'clientId', ''),
      coalesce(estimate.value ->> 'number', ''),
      nullif(estimate.value ->> 'date', '')::date,
      coalesce(estimate.value ->> 'status', 'pending'),
      coalesce(estimate.value ->> 'notes', ''),
      coalesce((estimate.value ->> 'overallDiscount')::numeric, 0),
      coalesce(estimate.value ->> 'overallDiscountType', 'percentage'),
      nullif(estimate.value ->> 'createdAt', '')::date,
      a.updated_at
    from public.app_state a
    cross join lateral jsonb_array_elements(coalesce(a.estimates, '[]'::jsonb)) estimate(value)
    on conflict (user_id, id) do update
      set user_id = excluded.user_id,
          client_id = excluded.client_id,
          number = excluded.number,
          estimate_date = excluded.estimate_date,
          status = excluded.status,
          notes = excluded.notes,
          overall_discount = excluded.overall_discount,
          overall_discount_type = excluded.overall_discount_type,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at;

    insert into public.estimate_items (
      user_id,
      id,
      estimate_id,
      position,
      description,
      notes,
      rate,
      qty,
      unit,
      discount_type,
      discount_amount,
      taxable
    )
    select
      a.user_id,
      line_item.value ->> 'id',
      estimate.value ->> 'id',
      line_item.ordinality - 1,
      coalesce(line_item.value ->> 'description', ''),
      coalesce(line_item.value ->> 'notes', ''),
      coalesce((line_item.value ->> 'rate')::numeric, 0),
      coalesce((line_item.value ->> 'qty')::numeric, 1),
      coalesce(line_item.value ->> 'unit', ''),
      coalesce(line_item.value ->> 'discountType', 'percentage'),
      coalesce((line_item.value ->> 'discountAmount')::numeric, 0),
      coalesce((line_item.value ->> 'taxable')::boolean, true)
    from public.app_state a
    cross join lateral jsonb_array_elements(coalesce(a.estimates, '[]'::jsonb)) estimate(value)
    cross join lateral jsonb_array_elements(coalesce(estimate.value -> 'items', '[]'::jsonb)) with ordinality line_item(value, ordinality)
    on conflict (user_id, id) do update
      set estimate_id = excluded.estimate_id,
          position = excluded.position,
          description = excluded.description,
          notes = excluded.notes,
          rate = excluded.rate,
          qty = excluded.qty,
          unit = excluded.unit,
          discount_type = excluded.discount_type,
          discount_amount = excluded.discount_amount,
          taxable = excluded.taxable;
  end if;
end $$;

-- ============================================================================
-- Add precomputed summary columns to invoices and estimates
-- ============================================================================

alter table public.invoices
add column if not exists item_count integer not null default 0,
add column if not exists subtotal numeric(12,2) not null default 0,
add column if not exists item_discount_total numeric(12,2) not null default 0,
add column if not exists overall_discount_amount numeric(12,2) not null default 0,
add column if not exists tax_total numeric(12,2) not null default 0,
add column if not exists total_amount numeric(12,2) not null default 0,
add column if not exists balance_due numeric(12,2) not null default 0;

alter table public.estimates
add column if not exists item_count integer not null default 0,
add column if not exists subtotal numeric(12,2) not null default 0,
add column if not exists item_discount_total numeric(12,2) not null default 0,
add column if not exists overall_discount_amount numeric(12,2) not null default 0,
add column if not exists tax_total numeric(12,2) not null default 0,
add column if not exists total_amount numeric(12,2) not null default 0;

-- ============================================================================
-- Backfill precomputed columns from line items
-- ============================================================================

-- INVOICES
update public.invoices i
set
  item_count = calc.item_count,
  subtotal = calc.subtotal,
  item_discount_total = calc.item_discount_total,
  overall_discount_amount = calc.overall_discount_amount,
  tax_total = calc.tax_total,
  total_amount = calc.total_amount,
  balance_due = greatest(calc.total_amount - coalesce(i.amount_paid, 0), 0)
from (
  select
    i.user_id,
    i.id,
    count(ii.id) as item_count,
    coalesce(sum(ii.rate * ii.qty), 0) as subtotal,
    coalesce(sum(
      case
        when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
        else ii.discount_amount
      end
    ), 0) as item_discount_total,
    greatest(
      case
        when i.overall_discount_type = 'percentage' then
          (
            coalesce(sum(
              greatest(
                ii.rate * ii.qty -
                case
                  when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
                  else ii.discount_amount
                end,
                0
              )
            ), 0)
          ) * (coalesce(i.overall_discount, 0) / 100)
        else coalesce(i.overall_discount, 0)
      end,
      0
    ) as overall_discount_amount,
    coalesce(sum(
      case
        when ii.taxable then
          greatest(
            greatest(
              ii.rate * ii.qty -
              case
                when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
                else ii.discount_amount
              end,
              0
            ),
            0
          )
        else 0
      end
    ), 0) as taxable_base,
    coalesce(bs.tax_rate, 0) as tax_rate,
    greatest(
      (
        coalesce(sum(
          greatest(
            ii.rate * ii.qty -
            case
              when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
              else ii.discount_amount
            end,
            0
          )
        ), 0)
      )
      -
      greatest(
        case
          when i.overall_discount_type = 'percentage' then
            (
              coalesce(sum(
                greatest(
                  ii.rate * ii.qty -
                  case
                    when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
                    else ii.discount_amount
                  end,
                  0
                )
              ), 0)
            ) * (coalesce(i.overall_discount, 0) / 100)
          else coalesce(i.overall_discount, 0)
        end,
        0
      )
      +
      (
        coalesce(sum(
          case
            when ii.taxable then
              greatest(
                ii.rate * ii.qty -
                case
                  when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
                  else ii.discount_amount
                end,
                0
              )
            else 0
          end
        ), 0) * (coalesce(bs.tax_rate, 0) / 100)
      ),
      0
    ) as total_amount,
    (
      coalesce(sum(
        case
          when ii.taxable then
            greatest(
              ii.rate * ii.qty -
              case
                when ii.discount_type = 'percentage' then (ii.rate * ii.qty) * (ii.discount_amount / 100)
                else ii.discount_amount
              end,
              0
            )
          else 0
        end
      ), 0) * (coalesce(bs.tax_rate, 0) / 100)
    ) as tax_total
  from public.invoices i
  left join public.invoice_items ii
    on ii.user_id = i.user_id and ii.invoice_id = i.id
  left join public.business_settings bs
    on bs.user_id = i.user_id
  group by i.user_id, i.id, i.overall_discount, i.overall_discount_type, bs.tax_rate
) calc
where calc.user_id = i.user_id
  and calc.id = i.id;

-- ESTIMATES
update public.estimates e
set
  item_count = calc.item_count,
  subtotal = calc.subtotal,
  item_discount_total = calc.item_discount_total,
  overall_discount_amount = calc.overall_discount_amount,
  tax_total = calc.tax_total,
  total_amount = calc.total_amount
from (
  select
    e.user_id,
    e.id,
    count(ei.id) as item_count,
    coalesce(sum(ei.rate * ei.qty), 0) as subtotal,
    coalesce(sum(
      case
        when ei.discount_type = 'percentage' then (ei.rate * ei.qty) * (ei.discount_amount / 100)
        else ei.discount_amount
      end
    ), 0) as item_discount_total,
    greatest(
      case
        when e.overall_discount_type = 'percentage' then
          (
            coalesce(sum(
              greatest(
                ei.rate * ei.qty -
                case
                  when ei.discount_type = 'percentage' then (ei.rate * ei.qty) * (ei.discount_amount / 100)
                  else ei.discount_amount
                end,
                0
              )
            ), 0)
          ) * (coalesce(e.overall_discount, 0) / 100)
        else coalesce(e.overall_discount, 0)
      end,
      0
    ) as overall_discount_amount,
    (
      coalesce(sum(
        case
          when ei.taxable then
            greatest(
              ei.rate * ei.qty -
              case
                when ei.discount_type = 'percentage' then (ei.rate * ei.qty) * (ei.discount_amount / 100)
                else ei.discount_amount
              end,
              0
            )
          else 0
        end
      ), 0) * (coalesce(bs.tax_rate, 0) / 100)
    ) as tax_total,
    greatest(
      (
        coalesce(sum(
          greatest(
            ei.rate * ei.qty -
            case
              when ei.discount_type = 'percentage' then (ei.rate * ei.qty) * (ei.discount_amount / 100)
              else ei.discount_amount
            end,
            0
          )
        ), 0)
      )
      -
      greatest(
        case
          when e.overall_discount_type = 'percentage' then
            (
              coalesce(sum(
                greatest(
                  ei.rate * ei.qty -
                  case
                    when ei.discount_type = 'percentage' then (ei.rate * ei.qty) * (ei.discount_amount / 100)
                    else ei.discount_amount
                  end,
                  0
                )
              ), 0)
            ) * (coalesce(e.overall_discount, 0) / 100)
          else coalesce(e.overall_discount, 0)
        end,
        0
      )
      +
      (
        coalesce(sum(
          case
            when ei.taxable then
              greatest(
                ei.rate * ei.qty -
                case
                  when ei.discount_type = 'percentage' then (ei.rate * ei.qty) * (ei.discount_amount / 100)
                  else ei.discount_amount
                end,
                0
              )
            else 0
          end
        ), 0) * (coalesce(bs.tax_rate, 0) / 100)
      ),
      0
    ) as total_amount
  from public.estimates e
  left join public.estimate_items ei
    on ei.user_id = e.user_id and ei.estimate_id = e.id
  left join public.business_settings bs
    on bs.user_id = e.user_id
  group by e.user_id, e.id, e.overall_discount, e.overall_discount_type, bs.tax_rate
) calc
where calc.user_id = e.user_id
  and calc.id = e.id;
