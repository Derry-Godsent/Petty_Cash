export interface AccessLink { token: string; viewerToken?: string }
const KEY = 'petty-cash-private-link-v1';
const validToken = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function newToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function rememberAccess(access: AccessLink) {
  localStorage.setItem(KEY, JSON.stringify(access));
}

export function readAccess(): AccessLink | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (params.has('access')) {
    const token = params.get('access');
    const viewerToken = params.get('view');
    // Remove credentials from the address bar/history, even for malformed links.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!validToken(token) || (viewerToken !== null && !validToken(viewerToken))) throw new Error('This access link is incomplete. Please open the full private link.');
    const access = { token, ...(viewerToken ? { viewerToken } : {}) };
    rememberAccess(access);
    return access;
  }
  const saved = localStorage.getItem(KEY);
  if (!saved) return null;
  const access = JSON.parse(saved);
  if (!validToken(access.token) || (access.viewerToken && !validToken(access.viewerToken))) throw new Error('The saved access link is invalid. Please reopen your original private link.');
  return access;
}

export function accessUrl(access: AccessLink, viewer = false): string {
  if (viewer && !access.viewerToken) return '';
  const params = new URLSearchParams({ access: viewer ? access.viewerToken! : access.token });
  if (!viewer && access.viewerToken) params.set('view', access.viewerToken);
  return `${window.location.origin}${window.location.pathname}#${params}`;
}

export async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
