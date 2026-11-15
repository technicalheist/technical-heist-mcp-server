export interface UserProfile {
    id?: string;
    email: string;
    name?: string;
    phone?: string;
    role?: string;
    is_verified?: boolean;
}
export declare class SessionManager {
    private accessToken;
    private refreshToken;
    private user;
    isAuthenticated(): boolean;
    getAccessToken(): string | null;
    getRefreshToken(): string | null;
    getUser(): UserProfile | null;
    saveTokens(accessToken: string, refreshToken?: string, user?: UserProfile): void;
    setUser(user: UserProfile): void;
    clearSession(): void;
}
export declare const session: SessionManager;
