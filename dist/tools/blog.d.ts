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
    media?: Array<{
        media_id: string;
        position: number;
    }>;
}
export interface MediaItem {
    id: string;
    key: string;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    width?: number | null;
    height?: number | null;
    alt?: string | null;
    articleCount?: number;
    createdAt: string;
}
export declare function registerBlogTools(server: McpServer): void;
