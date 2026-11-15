export class SessionManager {
    accessToken = process.env.TECHNICALHEIST_ACCESS_TOKEN || null;
    refreshToken = process.env.TECHNICALHEIST_REFRESH_TOKEN || null;
    user = null;
    isAuthenticated() {
        return !!this.accessToken;
    }
    getAccessToken() {
        return this.accessToken;
    }
    getRefreshToken() {
        return this.refreshToken;
    }
    getUser() {
        return this.user;
    }
    saveTokens(accessToken, refreshToken, user) {
        this.accessToken = accessToken;
        if (refreshToken) {
            this.refreshToken = refreshToken;
        }
        if (user) {
            this.user = user;
        }
    }
    setUser(user) {
        this.user = user;
    }
    clearSession() {
        this.accessToken = null;
        this.refreshToken = null;
        this.user = null;
    }
}
export const session = new SessionManager();
