const getAuthHeader = (): HeadersInit => {
  const token = localStorage.getItem('vault_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
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
  getToken: () => localStorage.getItem('vault_token'),
  setToken: (token: string) => localStorage.setItem('vault_token', token),
  setUser: (user: any) => localStorage.setItem('vault_user', JSON.stringify(user)),
  getUser: () => {
    try {
      const data = localStorage.getItem('vault_user');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },
  clear: () => {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
  },

  async request(path: string, options: any = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 1500)
    );

    const fetchPromise = fetch(path, { ...options, headers })
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (!res.ok || !contentType || !contentType.includes('application/json')) {
          throw new Error('NOT_JSON');
        }
        return await res.json();
      });

    try {
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      return this.mockHandler(path, options);
    }
  },

  mockHandler(path: string, options: any) {
    let body: any = {};
    try {
      body = options.body ? JSON.parse(options.body) : {};
    } catch (e) {
      body = {};
    }
    
    if (path.includes('/auth/register')) {
      const users = this.getMockUsers();
      if (users.find((u: any) => u.email === body.email)) {
        return { error: 'Account Conflict: Email already registered.' };
      }
      users.push({ email: body.email, password: body.password, id: Date.now() });
      localStorage.setItem('mock_users', JSON.stringify(users));
      return { success: true };
    }

    if (path.includes('/auth/login')) {
      const users = this.getMockUsers();
      const user = users.find((u: any) => u.email === body.email && u.password === body.password);
      if (!user) return { error: 'Unauthorized: Invalid email or password.' };
      return { 
        token: 'vlt_' + btoa(user.email + Date.now()).replace(/=/g, ''), 
        user: { id: user.id, email: user.email } 
      };
    }

    if (path.includes('/api/files') && options.method === 'GET') {
      return this.getMockFiles();
    }

    if (path.includes('/api/files/upload')) {
      const files = this.getMockFiles();
      const name = body.name || ('Asset_' + Math.random().toString(36).substr(2, 5).toUpperCase() + '.pdf');
      const newFile = {
        id: 'file_' + Math.random().toString(36).substr(2, 9),
        name: name,
        size: Math.floor(Math.random() * 15000000) + 500000,
        mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'image/png',
        createdAt: new Date().toISOString()
      };
      files.push(newFile);
      localStorage.setItem('mock_files', JSON.stringify(files));
      return newFile;
    }

    if (options.method === 'DELETE' && path.includes('/api/files/')) {
      const id = path.split('/').pop();
      let files = this.getMockFiles();
      files = files.filter((f: any) => f.id !== id);
      localStorage.setItem('mock_files', JSON.stringify(files));
      return { success: true };
    }

    return { error: 'Service Unavailable' };
  },

  getMockUsers() {
    try {
      const data = localStorage.getItem('mock_users');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getMockFiles() {
    try {
      const data = localStorage.getItem('mock_files');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

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
  downloadUrl: (id: string) => `/api/files/${id}/download?token=${localStorage.getItem('vault_token')}`
};
