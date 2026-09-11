// A simple API client for OpenList that uses our backend proxy to bypass CORS

export async function proxyRequest(targetUrl: string, method: string, headers: Record<string, string>, body?: any) {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      method,
      headers,
      body,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { code: 401, message: 'Unauthorized. Please login again.' };
    }
    throw new Error(`Proxy returned status ${response.status}`);
  }

  return response.json();
}

export async function proxyUpload(targetUrl: string, headers: Record<string, string>, base64Data: string) {
  const response = await fetch('/api/proxy-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      headers,
      base64Data,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { code: 401, message: 'Unauthorized. Please login again.' };
    }
    throw new Error(`Proxy returned status ${response.status}`);
  }

  return response.json();
}

