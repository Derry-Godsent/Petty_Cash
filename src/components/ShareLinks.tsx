import { useState } from 'react';
import { AccessLink, accessUrl } from '../lib/access';

interface Props { access: AccessLink; onReplaceViewer: () => Promise<void> }
export default function ShareLinks({ access, onReplaceViewer }: Props) {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = async (viewer: boolean) => {
    const url = accessUrl(access, viewer);
    try { await navigator.clipboard.writeText(url); setNotice(viewer ? 'View-only link copied.' : 'Owner link copied.'); }
    catch { setNotice('Copy unavailable.'); }
  };
  const replace = async () => {
    if (access.viewerToken && !confirm('Replace viewing link? The previous link will stop working.')) return;
    setBusy(true); setNotice('');
    try { await onReplaceViewer(); setNotice('Viewing link replaced.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not replace link.'); }
    finally { setBusy(false); }
  };
  return <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
    <h2 className="text-sm font-bold text-gray-900">Private cashbook links</h2>
    <div className="space-y-2">
      <label htmlFor="owner-link" className="block text-sm font-semibold">Owner link</label>
      <input id="owner-link" aria-label="Owner link" value={accessUrl(access)} readOnly className="w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm" />
      <button onClick={() => copy(false)} className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-semibold">Copy owner link</button>
    </div>
    {access.viewerToken && <div className="space-y-2">
      <label htmlFor="viewer-link" className="block text-sm font-semibold">View-only link</label>
      <input id="viewer-link" aria-label="View-only link" value={accessUrl(access, true)} readOnly className="w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm" />
      <button onClick={() => copy(true)} className="w-full py-3 border border-slate-300 rounded-xl text-sm font-semibold">Copy view-only link</button>
    </div>}
    <button disabled={busy} onClick={replace} className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600">{busy ? 'Replacing…' : access.viewerToken ? 'Replace viewing link' : 'Create a new viewing link'}</button>
    {notice && <p role="status" className="text-sm text-slate-700">{notice}</p>}
    <p className="text-xs text-gray-500">Owner links grant full access. Keep private.</p>
  </section>;
}
