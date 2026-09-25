-- 1. UGX price on subscription_plans (amount charged via mobile money)
alter table public.subscription_plans
  add column if not exists price_ugx integer not null default 0;

update public.subscription_plans set price_ugx = 150000 where slug = 'basic' and price_ugx = 0;
update public.subscription_plans set price_ugx = 244000 where slug = 'professional' and price_ugx = 0;
-- enterprise stays 0 (custom pricing)

-- 2. Subscription expiry on hospitals
alter table public.hospitals
  add column if not exists subscription_expires_at timestamp with time zone;

-- 3. payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  plan_slug text not null,
  amount integer not null default 0,
  currency text not null default 'UGX',
  period_months integer not null default 1,
  phone text not null,
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  status_message text,
  provider_reference text,
  raw_response jsonb,
  updated_at timestamp with time zone,
  completed_at timestamp with time zone,
  activated_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

grant select on public.payments to authenticated;
grant all on public.payments to service_role;

alter table public.payments enable row level security;

-- Hospital admins can view their own hospital's payments; super admins view all.
create policy "Hospital admins view own payments"
  on public.payments for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or (
      public.has_role(auth.uid(), 'hospital_admin')
      and hospital_id = coalesce(public.current_hospital_id(), '00000000-0000-0000-0000-000000000000'::uuid)
    )
  );

-- 4. activate_subscription: marks the hospital active and extends expiry on successful payment.
create or replace function public.activate_subscription(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital_id uuid;
  v_period_months integer;
  v_current_expires timestamp with time zone;
  v_new_expires timestamp with time zone;
begin
  select hospital_id, period_months
    into v_hospital_id, v_period_months
  from public.payments
  where id = p_payment_id and status = 'success';

  if v_hospital_id is null then
    return;
  end if;

  select subscription_expires_at
    into v_current_expires
  from public.hospitals where id = v_hospital_id;

  if v_current_expires is not null and v_current_expires > now() then
    v_new_expires := v_current_expires + make_interval(months => v_period_months);
  else
    v_new_expires := now() + make_interval(months => v_period_months);
  end if;

  update public.hospitals
    set subscription_status = 'active', subscription_expires_at = v_new_expires
  where id = v_hospital_id;

  update public.payments
    set activated_at = now()
  where id = p_payment_id and activated_at is null;
end;
$$;