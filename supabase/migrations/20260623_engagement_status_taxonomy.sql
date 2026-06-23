-- Engagement status taxonomy migration
-- Rewrites the legacy engagementStatus values stored in churches.data (jsonb)
-- to the new taxonomy. Run once against the live Supabase project.
--
--   active_partner                          -> partnering
--   strategic_partner / interested / initial_contact -> potential
--   not_contacted / dormant                 -> unreached
--   (unable_to_sign is new and starts empty)
--
-- Idempotent: rows already on the new values are left untouched.

update public.churches
   set data = jsonb_set(data, '{engagementStatus}', '"partnering"')
 where data->>'engagementStatus' = 'active_partner';

update public.churches
   set data = jsonb_set(data, '{engagementStatus}', '"potential"')
 where data->>'engagementStatus' in ('strategic_partner', 'interested', 'initial_contact');

update public.churches
   set data = jsonb_set(data, '{engagementStatus}', '"unreached"')
 where data->>'engagementStatus' in ('not_contacted', 'dormant');
