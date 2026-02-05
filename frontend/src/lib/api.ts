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
  
  // Check content-type before parsing JSON
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error('[API ERROR] NOT_JSON response:', {
      url: res.url,
      status: res.status,
      contentType,
      body: text.slice(0, 200)
    });
    throw new Error(`NOT_JSON: Expected JSON but got ${contentType}`);
  }
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  
  const data = await res.json();
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
    const isFormData = options.body instanceof FormData;
    // Uploads must not send Content-Type; browser sets multipart/form-data; boundary=...
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    };
    if (isFormData) {
      delete headers['Content-Type'];
      // VERIFY: Log if Content-Type was somehow set (this breaks Multer)
      if (headers['Content-Type']) {
        console.error('[API ERROR] Content-Type set for FormData!', headers['Content-Type']);
      }
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 30000) // 30s for VM
    );

    const fetchPromise = fetch(path, { 
      ...options, 
      headers, 
      credentials: 'include',
      signal: options.signal // Support AbortController
    })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok) {
          // Try to get error message from JSON if possible
          if (contentType.includes('application/json')) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed: ${res.status}`);
          } else {
            const text = await res.text();
            throw new Error(`Request failed: ${res.status} - ${text.slice(0, 100)}`);
          }
        }
        
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          console.error('[API ERROR] NOT_JSON response:', {
            url: res.url,
            status: res.status,
            contentType,
            body: text.slice(0, 200)
          });
          throw new Error(`NOT_JSON: Expected JSON but got ${contentType}`);
        }
        
        return await res.json();
      });

    try {
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error; // Re-throw abort errors
      }
      if (error.message === 'Request timeout') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error; // Re-throw actual errors - no mock fallback in production
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
    const res = await fetch(path, { 
      headers: { ...getAuthHeader() },
      credentials: 'include' // Send session cookie
    });
    return handleResponse(res);
  },
  post: async (path: string, body: any) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
      credentials: 'include' // Send session cookie
    });
    return handleResponse(res);
  },
  upload: async (path: string, formData: FormData) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
      credentials: 'include' // Send session cookie
    });
    return handleResponse(res);
  },
  delete: async (path: string) => {
    const res = await fetch(path, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
      credentials: 'include' // Send session cookie
    });
    return handleResponse(res);
  },
  downloadUrl: (id: string) => `/api/files/${id}/download?token=${localStorage.getItem('vault_token')}`
};

/** Dispatch so Dashboard/Storage can refetch stats after upload/delete/restore */
export const notifyFilesChanged = () => {
  try {
    window.dispatchEvent(new CustomEvent('securestore:files-changed'));
  } catch (_) {}
};
