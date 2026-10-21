-- Refunds, disputes and fraud warnings on wedding plan payments.
-- A fully refunded or disputed payment no longer counts toward the wedding's plan
-- (lib/payments.ts recomputes the plan from the payments still marked 'paid').
-- A dispute the business wins puts the payment back to 'paid'.
alter table payments drop constraint payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('pending', 'paid', 'failed', 'expired', 'refunded', 'disputed'));
alter table payments add column if not exists fraud_warning_at timestamptz;
