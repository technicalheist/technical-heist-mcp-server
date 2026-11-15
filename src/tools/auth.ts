import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { api, ApiError } from '../api.js';
import { session } from '../session.js';

export function registerAuthTools(server: McpServer): void {
  // Login Tool
  server.tool(
    'login',
    'Authenticate with Technical Heist using your account email and password to access protected vault tools',
    {
      email: z.string().email().describe('User email address'),
      password: z.string().min(1).describe('Account password'),
    },
    async ({ email, password }) => {
      try {
        const response = await api.authPost('/api/auth/login', {
          email: email.trim(),
          password,
        });

        const { accessToken, refreshToken, user } = response;
        if (!accessToken) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Authentication response did not contain an access token.',
              },
            ],
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
                text: 'Not authenticated. Please call the "login" tool with your email and password.',
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
