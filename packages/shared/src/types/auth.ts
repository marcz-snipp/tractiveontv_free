export interface AuthTokenRequest {
  grant_type: 'tractive';
  platform_email: string;
  platform_token: string;
}

export interface AuthToken {
  user_id: string;
  client_id: string;
  expires_at: number;
  access_token: string;
  scope?: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  accessToken: string;
  expiresAt: number;
}
