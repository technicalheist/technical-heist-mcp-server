export interface AppConfig {
  authBaseUrl: string;
  apiBaseUrl: string;
}

export const config: AppConfig = {
  authBaseUrl: process.env.TECHNICALHEIST_AUTH_URL || process.env.AUTH_BASE_URL || 'https://auth.technicalheist.com',
  apiBaseUrl: process.env.TECHNICALHEIST_API_URL || process.env.API_BASE_URL || 'https://www.technicalheist.com',
};
