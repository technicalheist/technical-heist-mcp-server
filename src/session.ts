export interface UserProfile {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  is_verified?: boolean;
}

export class SessionManager {
  private accessToken: string | null = process.env.TECHNICALHEIST_ACCESS_TOKEN || null;
  private refreshToken: string | null = process.env.TECHNICALHEIST_REFRESH_TOKEN || null;
  private apiKey: string | null = process.env.TECHNICALHEIST_API_KEY || null;
  private user: UserProfile | null = null;

  public isAuthenticated(): boolean {
    return !!this.accessToken || !!this.apiKey;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  public getUser(): UserProfile | null {
    return this.user;
  }

  public saveTokens(accessToken: string, refreshToken?: string, user?: UserProfile): void {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    if (user) {
      this.user = user;
    }
  }

  public setUser(user: UserProfile): void {
    this.user = user;
  }

  public clearSession(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.apiKey = null;
    this.user = null;
  }
}

export const session = new SessionManager();
