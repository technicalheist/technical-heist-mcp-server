import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export interface SecretItem {
    id: string;
    service_name: string;
    account_name: string;
    secret: string;
    created_at?: string;
}
export declare function registerAuthenticatorTools(server: McpServer): void;
