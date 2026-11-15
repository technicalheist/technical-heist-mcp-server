import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export interface TaskItem {
    id: string;
    title: string;
    is_completed: boolean;
    priority?: 'low' | 'medium' | 'high' | string;
    category?: string;
    created_at?: string;
    updated_at?: string;
}
export declare function registerTasksTools(server: McpServer): void;
