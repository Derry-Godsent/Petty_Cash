import { supabase, configurationError } from './supabase';

export const pushPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
export function needsHomeScreen(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !window.matchMedia('(display-mode: standalone)').matches && !(navigator as Navigator & { standalone?: boolean }).standalone;
}
export function supportsPush(): boolean {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
export async function pushRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (configurationError) throw new Error(configurationError);
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
function applicationServerKey() {
  const base64 = pushPublicKey.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), c => c.charCodeAt(0));
  if (bytes.length !== 65) throw new Error('Notification configuration is invalid.');
  return bytes;
}
export async function getPushRegistration(): Promise<ServiceWorkerRegistration> {
  // serviceWorker.ready never rejects and can hang forever if no worker installs.
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration?.active) throw new Error('Notifications are unavailable. Reopen the installed app.');
  return registration;
}
export async function enablePush(token: string): Promise<void> {
  // Called directly from a button, preserving the gesture required on iOS.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notifications are blocked in device settings.' : 'Notification permission was not granted.');
  const registration = await getPushRegistration();
  let subscription = await registration.pushManager.getSubscription();
  let created = false;
  try {
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey() });
      created = true;
    }
    await pushRpc('pc_push_subscribe', { p_token: token, p_subscription: subscription.toJSON() });
  } catch (error) {
    // Don't leave a newly created orphan endpoint when registration fails.
    if (created && subscription) await subscription.unsubscribe().catch(() => false);
    throw error;
  }
}
export async function disablePush(token: string): Promise<void> {
  const registration = await getPushRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await pushRpc('pc_push_unsubscribe', { p_token: token, p_endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
export async function isPushEnabled(token: string): Promise<boolean> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  return pushRpc<boolean>('pc_push_status', { p_token: token, p_endpoint: subscription.endpoint });
}
