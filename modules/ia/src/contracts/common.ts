export interface IAErrorContract {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface IABaseResponse<T> {
  ok: boolean;
  data: T;
  errors?: IAErrorContract[];
  traceId?: string;
  meta?: Record<string, unknown>;
}

export interface IATimeStamped {
  createdAt: string;
  updatedAt?: string;
}
