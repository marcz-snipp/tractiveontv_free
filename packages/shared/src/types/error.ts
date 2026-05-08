export interface TractiveErrorBody {
  error?: string;
  message?: string;
}

export class TractiveApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: TractiveErrorBody | string | null,
    message?: string,
  ) {
    super(message ?? `Tractive API error ${status}`);
    this.name = 'TractiveApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}
