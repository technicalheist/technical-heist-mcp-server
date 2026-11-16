import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export interface DocTreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    ext?: string;
    children?: DocTreeNode[];
}
export declare function registerDocsTools(server: McpServer): void;
