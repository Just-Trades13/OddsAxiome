import { auth } from './firebase.ts';

const _backend = process.env.VITE_BACKEND_URL || '';
const BASE_URL = _backend + '/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function apiGet<T>(path: string, requireAuth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    Object.assign(headers, await getAuthHeaders());
  }
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: any, requireAuth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    Object.assign(headers, await getAuthHeaders());
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: any, requireAuth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    Object.assign(headers, await getAuthHeaders());
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error ${res.status}`);
  }
  return res.json();
}

// Auth sync — call after Firebase login/signup
export async function syncUser(data: {
  first_name: string;
  last_name?: string;
  zip?: string;
  phone?: string;
  country_code?: string;
  ref_code?: string;
}) {
  return apiPost('/auth/sync', data);
}

// User profile
export async function getMe() {
  return apiGet('/users/me', true);
}

export async function updateMe(data: Record<string, any>) {
  return apiPatch('/users/me', data);
}

// Stripe checkout
export async function createCheckout(tierSlug: string, billingCycle: 'monthly' | 'yearly') {
  return apiPost<{ checkout_url: string }>('/subscriptions/checkout', {
    tier_slug: tierSlug,
    interval: billingCycle,
  });
}

export async function getSubscriptionStatus() {
  return apiGet('/subscriptions/status', true);
}
