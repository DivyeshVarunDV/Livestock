const BASE_URL = 'http://localhost:3001';

type ApiFetchOptions = RequestInit & {
  token?: string | null;
};

export function getHeaders(tokenOverride?: string | null) {
  const token = tokenOverride ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  const { token, ...requestOptions } = options;
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new Error('Request timed out'));
    } catch {
      controller.abort();
    }
  }, 4000);

  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: requestOptions.signal || controller.signal,
      headers: {
        ...getHeaders(token),
        ...requestOptions.headers,
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('token');
          if (storedToken && storedToken !== 'gov-demo-token-2026') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
      }
      let errMsg = 'Something went wrong';
      try {
        const errData = await response.json();
        errMsg = Array.isArray(errData.message) ? errData.message.join(', ') : (errData.message || errMsg);
      } catch (e) {}
      throw new Error(errMsg);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(error?.message || 'Network request failed');
  }
}
