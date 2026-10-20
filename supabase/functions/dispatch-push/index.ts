// Deployed in Supabase Edge Runtime, not bundled into the browser app.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

const allowedHosts = new Set(['web.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com']);
function safeEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowedHosts.has(url.hostname) && !url.port && !url.username && !url.password;
  } catch { return false; }
}

Deno.serve(async request => {
  const secret = Deno.env.get('PUSH_DISPATCH_SECRET');
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT');
  if (!publicKey || !privateKey || !subject) return new Response('Push configuration missing', { status: 503 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const { data: jobs, error } = await db.rpc('pc_push_claim', { p_limit: 3 });
  if (error) return new Response('Queue unavailable', { status: 503 });
  let delivered = 0;
  for (const job of jobs || []) {
    let retry = false;
    try {
      const { data: book, error: bookError } = await db.from('pc_books').select('owner_hash,viewer_hash').eq('id', job.book_id).single();
      const { data: targets, error: targetsError } = await db.from('pc_push_subscriptions').select('*').eq('book_id', job.book_id);
      if (bookError || targetsError) throw new Error('Targets unavailable');
      // Never include transactions, amounts, links or capability tokens in push.
      const payload = JSON.stringify({ type: 'cashbook-updated' });
      // At most 20 devices/book and five parallel sends keep execution bounded.
      const subscriptions = targets || [];
      for (let offset = 0; offset < subscriptions.length; offset += 5) {
        await Promise.all(subscriptions.slice(offset, offset + 5).map(async target => {
        const current = target.capability_hash === book.owner_hash || target.capability_hash === book.viewer_hash;
        if (!current || !safeEndpoint(target.endpoint)) {
          const { error } = await db.from('pc_push_subscriptions').delete().eq('id', target.id).eq('capability_hash', target.capability_hash);
          if (error) retry = true;
          return;
        }
        try {
          await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, payload, {
            TTL: 3600, urgency: 'normal', timeout: 10000,
            // web-push uses https.request and does not follow redirects.
          });
          delivered++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            const { error: deleteError } = await db.from('pc_push_subscriptions').delete().eq('id', target.id).eq('capability_hash', target.capability_hash);
            if (deleteError) retry = true;
          } else retry = true;
        }
        }));
      }
    } catch { retry = true; }
    const { error: finishError } = await db.rpc('pc_push_finish', {
      p_book_id: job.book_id, p_revision: job.revision, p_lease_id: job.lease_id, p_retry: retry,
    });
    // Do not log subscription endpoints, keys, tokens or payloads.
    if (finishError) console.error('Push queue acknowledgement failed');
  }
  return Response.json({ delivered });
});
