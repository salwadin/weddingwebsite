-- Texting guests through Twilio (lib/sms/deliver.ts).
--
-- SMS rows are written like email rows: by the dashboard, as the organizer, under
-- RLS. Delivery rebuilds each text from the household's phone on file and checks
-- the wedding's bought plan and monthly allowance, so nothing here grants more.

alter table outbox add constraint outbox_channel check (channel in ('email', 'whatsapp', 'sms'));

create index outbox_pending_sms on outbox (created_at) where status = 'pending' and channel = 'sms';
-- Monthly allowance counts: texts a wedding sent recently.
create index outbox_sms_sent on outbox (wedding_id, sent_at) where channel = 'sms';
