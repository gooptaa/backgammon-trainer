export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    requestId?: string;
    mock?: boolean;
  };
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T> = ApiEnvelope<T> | ApiErrorEnvelope;
