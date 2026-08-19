const BASE_URL = 'http://localhost:3001';

export function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
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
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('token');
          // Only redirect if token exists and is NOT the demo token
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

    // Check if response is empty
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(error?.message || 'Network request failed');
  }
}
