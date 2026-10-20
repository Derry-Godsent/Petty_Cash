-- Run AFTER deploying dispatch-push and creating these Supabase Vault secrets:
-- pc_project_url: https://YOUR_PROJECT.supabase.co
-- pc_push_dispatch_secret: same random value as the Edge Function secret
-- Set secret values in the dashboard; do not commit them into this file.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ declare job bigint; begin
  for job in select jobid from cron.job where jobname = 'petty-cash-push' loop
    perform cron.unschedule(job);
  end loop;
end $$;
select cron.schedule('petty-cash-push', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'pc_project_url') || '/functions/v1/dispatch-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'pc_push_dispatch_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 140000
  );
$job$);
