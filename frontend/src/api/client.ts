const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      if (Array.isArray(errJson.detail)) {
        errorDetail = errJson.detail
          .map((d: any) => d.msg ? `${d.loc ? d.loc.filter((l: any) => l !== 'body').join(' ') + ': ' : ''}${d.msg}` : JSON.stringify(d))
          .join('; ');
      } else if (typeof errJson.detail === 'string') {
        errorDetail = errJson.detail;
      } else if (errJson.message) {
        errorDetail = errJson.message;
      } else {
        errorDetail = JSON.stringify(errJson);
      }
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export async function uploadFileApi<T = any>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Upload failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export async function downloadFile(endpoint: string, fallbackFilename: string) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;

  const disposition = response.headers.get('Content-Disposition');
  let filename = fallbackFilename;
  if (disposition && disposition.includes('filename=')) {
    filename = disposition.split('filename=')[1].replace(/["']/g, '');
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Loads a PDF document and opens it in a new browser tab/viewer ready for 1-click printing.
 */
export async function printPdf(endpoint: string) {
  const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}disposition=inline`;
  const response = await fetch(url);
  if (!response.ok) {
    let err = 'Failed to load document for printing';
    try {
      const j = await response.json();
      err = j.detail || err;
    } catch {}
    throw new Error(err);
  }

  const blob = await response.blob();
  const pdfBlob = new Blob([blob], { type: 'application/pdf' });
  const blobUrl = window.URL.createObjectURL(pdfBlob);

  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    // If pop-up blocked by browser security, use anchor tag
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
