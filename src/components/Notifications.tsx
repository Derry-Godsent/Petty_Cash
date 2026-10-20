import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { pushPublicKey, needsHomeScreen, supportsPush, isPushEnabled, enablePush, disablePush } from '../lib/notifications';

export default function Notifications({ token }: { token: string }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const homeScreen = needsHomeScreen();
  const supported = supportsPush();
  const configured = Boolean(pushPublicKey) && import.meta.env.PROD;
  const denied = supported && Notification.permission === 'denied';
  useEffect(() => {
    let active = true;
    setEnabled(false); setChecking(true); setError('');
    if (!supported || homeScreen || !configured) { setChecking(false); return; }
    isPushEnabled(token).then(value => { if (active) setEnabled(value); })
      .catch(() => { if (active) setError('Notification status unavailable.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [token, supported, homeScreen, configured]);
  const toggle = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (enabled) await disablePush(token);
      else await enablePush(token);
      setEnabled(!enabled);
    } catch (error) { setError(error instanceof Error ? error.message : 'Notification setup failed.'); }
    finally { setBusy(false); }
  };
  const status = homeScreen ? 'Add to Home Screen to enable notifications.'
    : !supported ? 'Not supported in this browser.'
    : !configured ? 'Not configured.'
    : denied ? 'Blocked in device settings.'
    : enabled ? 'Enabled on this device' : '';
  return <section aria-label="Notifications" className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-gray-600" /><h2 className="text-sm font-semibold">Notifications</h2></div>
      {supported && !homeScreen && configured && <button disabled={busy || checking || (denied && !enabled)} onClick={toggle}
        className="text-sm font-semibold px-3 py-2 rounded-lg bg-slate-100 text-slate-800 disabled:opacity-50">
        {checking ? 'Checking…' : busy ? 'Updating…' : enabled ? 'Disable notifications' : 'Enable notifications'}
      </button>}
    </div>
    {status && <p className="text-xs text-gray-500 mt-2">{status}</p>}
    {error && <p role="alert" className="text-xs text-red-700 mt-2">{error}</p>}
  </section>;
}
