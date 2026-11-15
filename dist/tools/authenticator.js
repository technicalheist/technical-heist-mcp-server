import { z } from 'zod';
import * as OTPAuth from 'otpauth';
import { api, ApiError } from '../api.js';
function calculateTotp(secretStr) {
    try {
        const cleanSecret = secretStr.replace(/[\s-]+/g, '').toUpperCase();
        const totp = new OTPAuth.TOTP({
            secret: OTPAuth.Secret.fromBase32(cleanSecret),
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        });
        const code = totp.generate();
        const remainingSeconds = 30 - (Math.floor(Date.now() / 1000) % 30);
        return { code, remainingSeconds };
    }
    catch (err) {
        return null;
    }
}
export function registerAuthenticatorTools(server) {
    // 1. List Authenticator Accounts
    server.tool('list_authenticator_accounts', 'List all 2FA / TOTP authenticator accounts stored in the vault, with active live 6-digit codes and expiration time remaining', {
        search: z
            .string()
            .optional()
            .describe('Optional search term to filter accounts by service name or account name'),
        reveal_secrets: z
            .boolean()
            .optional()
            .describe('Whether to reveal raw Base32 secret keys (defaults to false for security)'),
    }, async ({ search, reveal_secrets }) => {
        try {
            const rows = (await api.get('/api/secrets'));
            let list = Array.isArray(rows) ? rows : [];
            if (search && search.trim()) {
                const q = search.toLowerCase().trim();
                list = list.filter((item) => (item.service_name && item.service_name.toLowerCase().includes(q)) ||
                    (item.account_name && item.account_name.toLowerCase().includes(q)));
            }
            const accounts = list.map((item) => {
                const totp = item.secret ? calculateTotp(item.secret) : null;
                return {
                    id: item.id,
                    service_name: item.service_name,
                    account_name: item.account_name,
                    totp_code: totp ? totp.code : 'INVALID_SECRET',
                    seconds_remaining: totp ? totp.remainingSeconds : null,
                    created_at: item.created_at,
                    ...(reveal_secrets ? { secret: item.secret } : {}),
                };
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            count: accounts.length,
                            accounts,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to list authenticator accounts: ${message}` }],
            };
        }
    });
    // 2. Get Live TOTP Code
    server.tool('get_totp_code', 'Get a live 6-digit 2FA / TOTP verification code for a specific service or account ID', {
        id_or_service: z
            .string()
            .min(1)
            .describe('The unique account ID or the case-insensitive service name (e.g. "GitHub", "AWS")'),
    }, async ({ id_or_service }) => {
        try {
            const rows = (await api.get('/api/secrets'));
            const list = Array.isArray(rows) ? rows : [];
            const target = list.find((item) => item.id === id_or_service ||
                (item.service_name && item.service_name.toLowerCase() === id_or_service.toLowerCase()));
            if (!target) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text',
                            text: `No 2FA account matching "${id_or_service}" was found in the vault.`,
                        },
                    ],
                };
            }
            const totp = target.secret ? calculateTotp(target.secret) : null;
            if (!totp) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text',
                            text: `Failed to calculate TOTP code for "${target.service_name}": stored secret is invalid Base32.`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            id: target.id,
                            service_name: target.service_name,
                            account_name: target.account_name,
                            code: totp.code,
                            formatted_code: `${totp.code.slice(0, 3)} ${totp.code.slice(3)}`,
                            expires_in_seconds: totp.remainingSeconds,
                            period: 30,
                            algorithm: 'SHA1',
                            digits: 6,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to get TOTP code: ${message}` }],
            };
        }
    });
    // 3. Create Authenticator Account
    server.tool('create_authenticator_account', 'Add a new 2FA / TOTP secret into the encrypted vault for a service or account', {
        service_name: z
            .string()
            .min(1)
            .describe('Name of the service or application (e.g. "GitHub", "AWS", "Google")'),
        account_name: z
            .string()
            .min(1)
            .describe('Account identifier or email associated with the 2FA secret (e.g. "user@example.com")'),
        secret: z
            .string()
            .min(1)
            .describe('Base32 secret key provided by the service (spaces or dashes are automatically stripped)'),
    }, async ({ service_name, account_name, secret }) => {
        try {
            const cleanSecret = secret.replace(/[\s-]+/g, '').toUpperCase();
            try {
                OTPAuth.Secret.fromBase32(cleanSecret);
            }
            catch {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text',
                            text: 'Invalid Base32 secret key. Please ensure the key contains only valid Base32 characters (A-Z, 2-7).',
                        },
                    ],
                };
            }
            const created = (await api.post('/api/secrets', {
                service_name,
                account_name,
                secret: cleanSecret,
            }));
            const totp = calculateTotp(cleanSecret);
            return {
                content: [
                    {
                        type: 'text',
                        text: `2FA Authenticator account added successfully!\n\n${JSON.stringify({
                            id: created.id,
                            service_name,
                            account_name,
                            current_totp_code: totp ? totp.code : null,
                            expires_in_seconds: totp ? totp.remainingSeconds : null,
                        }, null, 2)}`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create authenticator account: ${message}` }],
            };
        }
    });
    // 4. Delete Authenticator Account
    server.tool('delete_authenticator_account', 'Delete a 2FA / TOTP secret from the vault by account ID', {
        id: z.string().min(1).describe('The unique ID of the authenticator secret to delete'),
    }, async ({ id }) => {
        try {
            const res = await api.delete(`/api/secrets/${id}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: res?.message || `Authenticator account ${id} deleted successfully.`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to delete authenticator account: ${message}` }],
            };
        }
    });
}
