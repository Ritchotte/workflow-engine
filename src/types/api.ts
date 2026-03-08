export interface ApiSuccessResponse<TData> {
  status: 'success';
  message?: string;
  data: TData;
}

export interface ApiErrorResponse {
  status: 'error';
  statusCode: number;
  message: string;
  details?: unknown;
  errors?: Array<{ path: string; message: string }>;
}
