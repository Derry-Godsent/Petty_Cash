# Push notifications deployment

No registration or email login is added. Each device explicitly opts in using its existing private cashbook link. Both owner and view-only access can opt in. Financial write restrictions are unchanged.

## Devices

- **iPhone/iPad:** iOS/iPadOS 16.4 or newer. Open the viewing link in Safari, add to Home Screen, then open that installed app and tap **Enable notifications**. If storage did not transfer, first paste the viewing link into the installed app's existing-cashbook field. Permission must be granted from the Home Screen app.
- **Android:** open the viewing link in supported Chrome, or install it, then tap **Enable notifications** and allow the prompt.
- Each phone has a separate opt-in. Either or both phones can receive notifications. Focus/Do Not Disturb, disabled OS permissions, connectivity, battery management and browser support can delay or suppress delivery.
- Lock-screen content is always **Petty Cash — Cashbook updated**. It contains no amounts, descriptions, recipient names or private links. Tapping opens/focuses the installed app; the private link is recovered from that app's local storage.

## Required server setup

This code is not a deployed push service. Live Supabase migrations/functions, secrets, the schedule and a production app build must be configured below. Apple/Google delivery and physical-device behavior cannot be verified inside this restricted sandbox.

1. Apply `supabase/migrations/202610200002_private_links.sql` if not already applied, then apply **`supabase/migrations/202610200003_push_notifications.sql`**. Back up old data as described in `MOBILE_SUPABASE_SETUP.md` before switching from the legacy app.
2. Generate a stable VAPID key pair with a real administrator contact (an email address here is only a technical contact, NOT a sign-in):

   ```sh
   npm run push:keys -- --subject=mailto:admin@example.com
   ```

   Replace the example contact. This writes `.env.push.local` with restrictive permissions and refuses to overwrite existing keys. **Do not commit or paste this file in chat.** It contains private server credentials. Save a secure backup. Key rotation requires devices to resubscribe.
3. Add **only `VITE_VAPID_PUBLIC_KEY`** to Vercel using the public value printed by the command. The value must match `VAPID_PUBLIC_KEY` in the private file. Never add `VAPID_PRIVATE_KEY`, `PUSH_DISPATCH_SECRET` or a Supabase service-role key to a `VITE_` variable.
4. With the Supabase CLI authenticated locally, set server secrets and deploy:

   ```sh
   npx supabase secrets set --env-file .env.push.local --project-ref YOUR_PROJECT_REF
   npx supabase functions deploy dispatch-push --project-ref YOUR_PROJECT_REF
   ```

   Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function. `supabase/config.toml` turns off gateway JWT verification for this one scheduled function; the handler independently requires `Authorization: Bearer PUSH_DISPATCH_SECRET`. Public anon/publishable keys are not accepted as dispatcher authorization.
5. In Supabase **Vault**, create two secrets using the dashboard (do not put values into committed SQL):
   - `pc_project_url`: the project's HTTPS Supabase URL, without a trailing slash.
   - `pc_push_dispatch_secret`: the exact `PUSH_DISPATCH_SECRET` from `.env.push.local`.
6. Run **`supabase/push-schedule.sql`** in SQL Editor. Enable Cron/pg_cron, pg_net and Vault in the dashboard if your project requires it. The job calls the dispatcher once a minute. The script replaces an existing job with the same name, avoiding duplicate schedules.
7. Rebuild/redeploy Vercel. Notifications are deliberately unavailable in Vite development mode because production service workers are not registered there. Open the production Home Screen app, allow the updated service worker to activate, and enable notifications.

## Delivery behavior

- Committed transaction inserts/deletes/updates and saved settings changes enqueue jobs in the same database transaction. Rolled-back changes do not notify. Replacing a viewing link does not generate a financial-update notification.
- Jobs are grouped per cashbook: several changes during a minute can produce one notification, avoiding an import flooding the phone. Normal delivery starts on the next minute's schedule, plus push-provider/network delay. This is **not an instant-delivery guarantee**.
- A leased, durable queue handles restarts and concurrent workers. Failures retry with backoff, up to eight attempts. Jobs remain for inspection after repeated failure. In-flight retries can cause duplicates; the notification tag consolidates them on the device. Web Push delivery is best effort, not an audit trail.
- At most 20 device endpoints per cashbook are supported. A browser endpoint subscribes to one cashbook/access link at a time. Re-enabling for a different cashbook replaces the binding. The dispatcher handles three cashbooks per invocation and five sends concurrently. This is intended for the small cashbook use case, not a bulk notification service.
- Expired endpoints (HTTP 404/410) are removed. Replacing the viewing link immediately removes subscriptions made with the old viewing token. Old in-flight/already-delivered notifications cannot be recalled.
- Notification endpoints/keys are private database rows; browser roles cannot read them. The dispatcher validates allowed push-service hosts again and never follows HTTP redirects. Unsupported push providers are rejected rather than allowing arbitrary server-side requests.
- Disabling notifications removes the server registration before unsubscribing the browser. If browser storage/site data is cleared, reopen the private link and enable notifications again. After browser subscription expiry or VAPID key rotation, re-enable from the app.

## Verify on a real phone

1. Open and install the viewing link, then opt in. Confirm **Enabled on this device**.
2. Close the app and lock the phone.
3. Add a small test transaction from a separate owner browser.
4. Wait for the next scheduled minute and check the generic notification. Tap it and verify the correct cashbook refreshes.
5. Test deletion, disabling notifications, and replacing the viewing link.
6. Check Supabase function logs, Cron run history and pg_net responses for failures. Inspect `pc_push_jobs` as an administrator for delayed/dead jobs; never expose the table publicly. The public key being present alone does not prove that the cron/dispatcher is running.

Automated checks: `npm test`, `npm run test:security`, `npm run typecheck`, `npm run build`. The Edge Function can be checked with Deno (`deno check supabase/functions/dispatch-push/index.ts`); its code is not part of browser TypeScript compilation. Tests cover queue/revocation/permissions, the generic service-worker notification, safe click handling and browser subscription flows with mocked services. They do not simulate actual Apple/Google push delivery.
