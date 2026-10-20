import { useState } from 'react';
import { layoutDiagnostics, LAYOUT_VERSION } from '../lib/viewport';

export default function AppInformation() {
  const [diagnostics, setDiagnostics] = useState<ReturnType<typeof layoutDiagnostics> | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    if (!confirm('Reload the app? Unsaved changes will be lost.')) return;
    setBusy(true); setNotice('');
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        await registration?.update();
        const worker = registration?.installing || registration?.waiting;
        if (worker && worker.state !== 'activated' && worker.state !== 'redundant') {
          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => { worker.removeEventListener('statechange', changed); reject(new Error('Update is taking longer than expected. Try again.')); }, 15000);
            const changed = () => {
              if (worker.state === 'activated' || worker.state === 'redundant') {
                clearTimeout(timer); worker.removeEventListener('statechange', changed); resolve();
              }
            };
            worker.addEventListener('statechange', changed);
            changed();
          });
        }
      }
      window.location.reload();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Update unavailable.'); setBusy(false); }
  };
  return <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
    <h2 className="text-sm font-semibold">App information</h2>
    <p className="text-xs text-gray-500">Layout {LAYOUT_VERSION}</p>
    <button type="button" disabled={busy} onClick={reload} className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium">{busy ? 'Checking…' : 'Check for updates'}</button>
    <details onToggle={event => { if (event.currentTarget.open) setDiagnostics(layoutDiagnostics()); }}>
      <summary className="text-xs text-gray-500 cursor-pointer py-2">Display diagnostics</summary>
      {diagnostics && <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{JSON.stringify(diagnostics, null, 2)}</pre>}
    </details>
    {notice && <p role="status" className="text-xs text-gray-600">{notice}</p>}
  </section>;
}
