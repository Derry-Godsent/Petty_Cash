# Mobile + private-link Supabase setup

## Current design: no registration, no email, no anonymous sign-in

The owner creates one cashbook. The app creates two separate long, random private links:

- **Owner link:** add/delete transactions, change settings, import/export, and manage the viewing link.
- **View-only link:** see balances, transactions/details and weekly reports. No adding, deleting, clearing, importing or settings changes. Give this link to your boss.

Both point to the same database cashbook. A normal website URL grants no access; it opens a welcome screen rather than silently creating another empty cashbook. The role is determined by Supabase, never a URL role flag. This replaces the earlier team-code/anonymous-session design.

## Required before deploying

1. **Export a backup from the existing app and back up the database first.** The migration retains old tables/data but revokes their browser API access. It does not guess who owns old browser-generated IDs or silently move existing transactions.
2. Run **`supabase/migrations/202610200002_private_links.sql`** in Supabase SQL Editor. It is self-contained. The earlier `202610200001_secure_cashbook.sql` is not required for this version. If you already ran it, apply `002` afterward.
3. **Do not rerun the old migrations after `002`.** They use a different authorization model and can reopen old table access.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel, using the project's URL and public anon/publishable API key. Never use a service-role key in client environment variables. Anonymous **Auth sign-in does not need to be enabled**; the public API key is used only to call the restricted private-link RPCs.
5. Deploy with `npm ci && npm run build`; serve `dist` over HTTPS. Production `sw.js` must revalidate (the existing Vercel headers handle it).
6. Open the deployed site, select **Create my cashbook**, and save your **owner link** somewhere private. Import your old JSON backup into this cashbook once, if needed.
7. Send only the **view-only link** to your boss. He opens it; there is no sign-up or code entry.
8. Record a test transaction, reload, and verify the row in Supabase `pc_entries`. Check that your boss sees the same transaction and cannot change it.

**Remote status:** This development environment cannot reach Supabase project hosts. The migration has not been applied remotely. Browser tests mock HTTP responses; database tests run real PostgreSQL-compatible SQL locally in PGlite. Test your actual deployment after applying the migration.

## Browser and installed mobile app

Open the same **owner link** on every device/browser where you manage cash. The app remembers the link in that browser's storage, so later visits to the normal site open the same cashbook.

- On iPhone/iPad, use Safari → Share → Add to Home Screen. On Android, use Chrome → Install app / Add to Home screen.
- Browser storage and Home Screen app storage may be separate. **If the installed app shows the welcome screen, paste your owner link into “Open an existing cashbook” once. Do not create another cashbook.** A boss's installed app should use the viewing link instead.
- Saving to the Home Screen is not the synchronization mechanism; both contexts read/write the same Supabase cashbook using the private link.
- While open and online, data refreshes every **10 seconds**, and immediately on focus, returning from sleep or reconnecting. This version uses authorized polling rather than direct Realtime table access, so private entries remain inaccessible through the public table API.
- No offline writes are claimed to have succeeded. Network failures preserve the form and show a warning/reconnect screen. The static app shell can be cached; financial API responses are not cached by the service worker.
- Input text is at least 16px to prevent iOS focus zoom. Pinch zoom remains available for accessibility. Dynamic viewport and safe-area padding fit notches, home indicators and short screens.
- Avoid uninstalling to refresh the app; fully close and reopen it first. If storage is cleared, reopen/paste the saved private link to recover access.

## Link security and recovery

- These links act like passwords. Anyone with the owner link can make changes; anyone with the viewing link can read. There is no verified-person identity, audit identity, registration or account recovery.
- Tokens have 256 bits of cryptographic randomness. Only SHA-256 hashes are stored in the database. Direct access to the new tables is revoked for browser roles; narrow `SECURITY DEFINER` functions validate capabilities and enforce write access on every call.
- Links use URL fragments, not query strings. Fragments are not sent in navigation requests. On opening, credentials are stored locally and removed from the address bar with `history.replaceState`. Do not log/share local storage, screenshots of owner links, or link-containing clipboard contents.
- Settings → **Copy view-only link** copies no owner key. The owner link contains the owner key plus the viewing key so another owner device can also copy the boss's link.
- **Replace viewing link** immediately revokes the old viewing token, including on devices where it was saved. You must send your boss the replacement. Copy an updated owner link too; older owner links still manage the cashbook, but their embedded viewing token is stale. The UI detects and removes stale viewing keys.
- Loss of all owner-link copies requires administrator-assisted recovery. A database administrator can assign a new random owner-token hash after independently verifying ownership; there is deliberately no public “claim old cashbook” endpoint.
- The public creation RPC does not require registration or CAPTCHA. For broader public exposure, use project/API rate limiting and abuse monitoring. Private links control access to existing cashbooks, not who may attempt to create new ones.

## Existing data

Export from the old app **before** applying `002`, then import into your newly created linked cashbook. Import does not preserve old record IDs. Old rows remain in the old tables for an administrator to recover; they are not deleted. An interrupted import reports the number saved; do not blindly reimport a full backup and duplicate those rows. The original team code no longer grants access to the new cashbook.

## Checks

```sh
npm ci
npm run typecheck
npm run build
npm test                 # mobile UI, owner/viewer links, cross-context sync (mock HTTP)
npm run test:security    # migration, viewer write rejection, isolation, revocation (PGlite)
npm audit
```

Linux tests use npm-distributed Chromium with bundled libraries. On other platforms install Chromium with `npx playwright install chromium`. Physical iOS Safari/Home Screen testing is still required to verify OS-specific keyboard and installation behavior.

## Optional push notifications

See [PUSH_NOTIFICATIONS_SETUP.md](./PUSH_NOTIFICATIONS_SETUP.md) for iPhone/Android opt-in and the required private server setup. Push is separate from the 10-second in-app data refresh; it works while the app is closed once deployed.

### Installed iPhone layout verification

The current layout revision is **viewport-5** (Settings → App information).
This revision never extends app controls past the drawable visual/layout viewport.
For older installed iOS shells reporting an already-excluded bottom strip plus
safe-area padding, it removes the duplicate padding rather than stretching to
`screen.height`. Normal browser, Android, split-screen and opaque-status-bar
layouts retain their system safe-area padding.

After deploying, use **Check for updates** in App information to check the service
worker and reload without clearing private-link storage or push subscriptions.
If a physical phone still has a gap, expand **Display diagnostics** and capture
those values with the screen. Diagnostics contain viewport/screen/inset geometry
and the layout revision only, not private access links or financial data.
Regression tests reproduce the reported 390×797 drawable viewport on a 390×844
screen with 47px/34px insets. They assert every tab label is inside the drawable
area, rather than accepting an oversized navigation bottom of 844px. Actual
iPhone verification is still necessary.
