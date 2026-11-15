export class SessionManager {
    accessToken = process.env.TECHNICALHEIST_ACCESS_TOKEN || null;
    refreshToken = process.env.TECHNICALHEIST_REFRESH_TOKEN || null;
    apiKey = process.env.TECHNICALHEIST_API_KEY || null;
    user = null;
    isAuthenticated() {
        return !!this.accessToken || !!this.apiKey;
    }
    getAccessToken() {
        return this.accessToken;
    }
    getRefreshToken() {
        return this.refreshToken;
    }
    getApiKey() {
        return this.apiKey;
    }
    setApiKey(apiKey) {
        this.apiKey = apiKey;
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
        this.apiKey = null;
        this.user = null;
    }
}
export const session = new SessionManager();
