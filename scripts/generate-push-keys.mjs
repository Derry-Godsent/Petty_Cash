import webpush from 'web-push';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const subject = process.argv.find(value => value.startsWith('--subject='))?.slice('--subject='.length);
if (!subject || !/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) {
  console.error('Usage: npm run push:keys -- --subject=mailto:admin@example.com');
  process.exit(1);
}
const keys = webpush.generateVAPIDKeys();
try {
  writeFileSync('.env.push.local', `VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=${subject}\nPUSH_DISPATCH_SECRET=${randomBytes(32).toString('hex')}\n`, { mode: 0o600, flag: 'wx' });
} catch (error) {
  console.error(error.code === 'EEXIST' ? '.env.push.local already exists. Reuse the existing keys; rotating them requires devices to resubscribe.' : 'Could not write push key file.');
  process.exit(1);
}
console.log('Server secrets saved to .env.push.local (keep private).');
console.log(`Set this public key in Vercel: VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
