const getAuthHeader = (): HeadersInit => {
  const token = localStorage.getItem('vlt_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};


const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    localStorage.removeItem('vlt_token');
    localStorage.removeItem('vlt_user');
    if (window.location.hash !== '#/login') {
      window.location.hash = '#/login';
    }
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  get: async (path: string) => {
    const res = await fetch(path, { headers: { ...getAuthHeader() } });
    return handleResponse(res);
  },
  post: async (path: string, body: any) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },
  upload: async (path: string, formData: FormData) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse(res);
  },
  delete: async (path: string) => {
    const res = await fetch(path, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },
  downloadUrl: (id: string) => `/api/files/${id}/download?token=${localStorage.getItem('vlt_token')}`
};
