export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

type ApiFetchOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getHeaders(tokenOverride?: string | null) {
  const token = tokenOverride ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function clearSessionAndRedirect() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?expired=1';
  }
}

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  const { token, ...requestOptions } = options;
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new Error('Request timed out'));
    } catch {
      controller.abort();
    }
  }, 15000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...requestOptions,
      signal: requestOptions.signal || controller.signal,
      headers: {
        ...getHeaders(token),
        ...requestOptions.headers,
      },
    });
  } catch (error: any) {
    throw new ApiError(error?.message === 'Request timed out' ? 'The server did not respond in time.' : 'Unable to reach the server. Check your connection.', 0);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errMsg = response.status === 403 ? 'You are not authorised to perform this action.' : 'Something went wrong';
    try {
      const errData = await response.json();
      errMsg = Array.isArray(errData.message) ? errData.message.join(', ') : errData.message || errMsg;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    // An expired / revoked session anywhere except the login call itself.
    if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
      clearSessionAndRedirect();
    }
    throw new ApiError(errMsg, response.status);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
