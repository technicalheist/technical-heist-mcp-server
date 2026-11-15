import { z } from 'zod';
import http from 'http';
import crypto from 'crypto';
import { exec } from 'child_process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { api, ApiError, authenticateWithApiKey } from '../api.js';
import { session } from '../session.js';
import { config } from '../config.js';

function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd = '';
  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.error(`[technical-heist-mcp-server] Could not automatically open browser: ${err.message}`);
      console.error(`[technical-heist-mcp-server] Please open URL manually: ${url}`);
    }
  });
}

function performBrowserLogin(): Promise<{ accessToken: string; refreshToken?: string }> {
  return new Promise((resolve, reject) => {
    const state = crypto.randomBytes(16).toString('hex');
    let server: http.Server;

    const timeout = setTimeout(() => {
      if (server) server.close();
      reject(new Error('Browser authentication timed out after 2 minutes. Please try again.'));
    }, 120000);

    server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
        if (reqUrl.pathname === '/callback') {
          const accessToken = reqUrl.searchParams.get('access_token');
          const refreshToken = reqUrl.searchParams.get('refresh_token') || undefined;
          const returnedState = reqUrl.searchParams.get('state');

          if (!accessToken) {
            const errorMsg = reqUrl.searchParams.get('error') || 'No access token was returned by the authorization server.';
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<h3>Login failed: ${errorMsg}</h3>`);
            clearTimeout(timeout);
            server.close();
            reject(new Error(errorMsg));
            return;
          }

          if (returnedState && returnedState !== state) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h3>Security validation error: OAuth state mismatch.</h3>');
            clearTimeout(timeout);
            server.close();
            reject(new Error('OAuth state mismatch'));
            return;
          }

          // Return success response to the user's browser
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Technical Heist — Authenticated</title>
  <style>
    body { background: #0a0a0a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 1.25rem; padding: 2.5rem; text-align: center; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .badge { width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 1.25rem auto; color: #10b981; }
    h1 { font-size: 1.35rem; font-weight: 700; margin: 0 0 0.5rem 0; color: #fff; }
    p { color: #9ca3af; font-size: 0.9rem; margin: 0 0 1.25rem 0; line-height: 1.5; }
    .footer { font-size: 0.8rem; color: #10b981; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓</div>
    <h1>Authentication Successful</h1>
    <p>Your Technical Heist workspace is now authorized for your AI agent and MCP tools.</p>
    <div class="footer">You may safely close this browser window.</div>
  </div>
</body>
</html>`);

          clearTimeout(timeout);
          server.close();
          resolve({ accessToken, refreshToken });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      } catch (err: any) {
        clearTimeout(timeout);
        server.close();
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 4192;
      const callbackUrl = `http://127.0.0.1:${port}/callback`;
      const authUrl = `${config.authBaseUrl}/login?client_id=mcp&redirect_to=${encodeURIComponent(callbackUrl)}&state=${state}`;

      console.error(`[technical-heist-mcp-server] Authorize URL: ${authUrl}`);
      openBrowser(authUrl);
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export function registerAuthTools(server: McpServer): void {
  // Login Tool with API Key, Credentials, or Browser OAuth
  server.tool(
    'login',
    'Authenticate with Technical Heist using an API key (headless), email & password, or interactive browser OAuth if omitted.',
    {
      api_key: z.string().optional().describe('Technical Heist API Key (e.g. th_live_...) for headless authentication'),
      email: z.string().email().optional().describe('Account email address'),
      password: z.string().optional().describe('Account password'),
    },
    async ({ api_key, email, password }) => {
      try {
        // Mode 1: API Key authentication
        const keyToUse = api_key || session.getApiKey();
        if (keyToUse) {
          session.setApiKey(keyToUse);
          const authRes = await authenticateWithApiKey(keyToUse);
          const emailAddr = authRes?.user?.email || 'verified user';
          return {
            content: [
              {
                type: 'text',
                text: `Successfully authenticated via API Key as ${emailAddr}! Headless session is active and vault operations are unlocked.`,
              },
            ],
          };
        }

        // Mode 2: Direct email & password API authentication
        if (email && password) {
          const response = await api.authPost('/api/auth/login', {
            email: email.trim(),
            password,
          });

          const { accessToken, refreshToken, user } = response;
          if (!accessToken) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Authentication response did not contain an access token.' }],
            };
          }

          session.saveTokens(accessToken, refreshToken, user);

          return {
            content: [
              {
                type: 'text',
                text: `Successfully authenticated as ${user?.email || email}. User ID: ${
                  user?.id || 'verified'
                }. You can now perform vault operations such as managing notes.`,
              },
            ],
          };
        }

        // Mode 3: Browser-based OAuth loopback flow
        const tokens = await performBrowserLogin();
        session.saveTokens(tokens.accessToken, tokens.refreshToken);

        // Fetch user profile
        let userEmail = 'authenticated user';
        try {
          const profile = await api.get('/api/auth/me');
          session.setUser(profile);
          userEmail = profile.email || userEmail;
        } catch {
          // Profile fetch optional
        }

        return {
          content: [
            {
              type: 'text',
              text: `Successfully authenticated via browser as ${userEmail}! Session tokens are cached and vault operations (such as notes) are now unlocked.`,
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Login failed: ${message}`,
            },
          ],
        };
      }
    }
  );

  // Get Current User / Session Status
  server.tool(
    'get_current_user',
    'Check authentication status and retrieve profile details for the currently signed-in user',
    {},
    async () => {
      try {
        if (!session.isAuthenticated()) {
          return {
            content: [
              {
                type: 'text',
                text: 'Not authenticated. Please configure TECHNICALHEIST_API_KEY in your MCP environment or run the "login" tool.',
              },
            ],
          };
        }

        const profile = await api.get('/api/auth/me');
        session.setUser(profile);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(profile, null, 2),
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to retrieve current user: ${message}`,
            },
          ],
        };
      }
    }
  );

  // Logout Tool
  server.tool(
    'logout',
    'Sign out and invalidate the local Technical Heist session token',
    {},
    async () => {
      session.clearSession();
      return {
        content: [
          {
            type: 'text',
            text: 'Successfully logged out and cleared session credentials.',
          },
        ],
      };
    }
  );
}
