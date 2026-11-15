import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export interface NoteItem {
    id: string;
    title: string;
    content: string;
    is_favorite?: boolean;
    created_at?: string;
    updated_at?: string;
}
export declare function registerNotesTools(server: McpServer): void;
