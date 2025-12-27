import api from '../lib/api';

type ImportMode = 'insert_only' | 'upsert' | 'replace';

type ImportStatusResponse = {
  jobId: number;
  status: string;
  mode: string;
  total_rows: number;
  processed_rows: number;
  inserted_rows: number;
  updated_rows: number;
  skipped_rows: number;
  failed_rows: number;
  error_count: number;
  error_samples: Array<{ row: number; reason: string }>;
  started_at?: string;
  finished_at?: string;
  errors_ready: boolean;
};

export const startPerfumeImport = async (file: File, mode: ImportMode, downloadImages: boolean) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  formData.append('downloadImages', String(downloadImages));

  const response = await api.post<{ jobId: number }>('/admin/perfumes/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const fetchPerfumeImportStatus = async (jobId: number) => {
  const response = await api.get<ImportStatusResponse>(`/admin/perfumes/import/${jobId}/status`);
  return response.data;
};

export const buildPerfumeImportErrorsUrl = (jobId: number) => {
  const baseUrl = api.defaults.baseURL ?? '';
  const prefix = baseUrl.endsWith('/') || baseUrl === '' ? baseUrl : `${baseUrl}/`;
  return `${prefix}admin/perfumes/import/${jobId}/errors.csv`;
};

export type { ImportMode, ImportStatusResponse };
