import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export interface ArticleItem {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string | null;
    coverImage?: string | null;
    published: boolean;
    publishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    authorName?: string | null;
    category?: {
        id: string;
        name: string;
        slug: string;
    } | null;
    tags?: Array<{
        id: string;
        name: string;
        slug: string;
    }>;
}
export declare function registerBlogTools(server: McpServer): void;
