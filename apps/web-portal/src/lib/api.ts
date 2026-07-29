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
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
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
}
