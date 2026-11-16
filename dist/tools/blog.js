import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { api, ApiError } from '../api.js';
const EXT_TO_MIME = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    json: 'application/json',
    md: 'text/markdown',
    markdown: 'text/markdown',
    zip: 'application/zip',
};
function inferMimeType(filename, explicitMime) {
    if (explicitMime)
        return explicitMime;
    const ext = path.extname(filename).toLowerCase().replace(/^\./, '');
    return EXT_TO_MIME[ext] || 'application/octet-stream';
}
export function registerBlogTools(server) {
    // 1. List Blog Articles
    server.tool('list_blog_articles', 'List blog articles from Technical Heist with pagination, status filtering (published/draft), and optional keyword search', {
        status: z
            .enum(['all', 'published', 'draft'])
            .optional()
            .describe('Filter articles by publication status (defaults to "all")'),
        page: z.number().int().positive().optional().describe('Page number (defaults to 1)'),
        limit: z.number().int().positive().max(50).optional().describe('Number of articles per page (defaults to 20)'),
        search: z.string().optional().describe('Keyword to search across article titles, excerpts, and content'),
    }, async ({ status = 'all', page = 1, limit = 20, search }) => {
        try {
            const queryParams = new URLSearchParams({
                status,
                page: String(page),
                limit: String(limit),
            });
            const res = (await api.get(`/api/blog/admin/articles?${queryParams.toString()}`));
            let articles = res.articles || [];
            if (search && search.trim()) {
                const q = search.toLowerCase().trim();
                articles = articles.filter((a) => (a.title && a.title.toLowerCase().includes(q)) ||
                    (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
                    (a.content && a.content.toLowerCase().includes(q)));
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            count: articles.length,
                            pagination: res.pagination,
                            articles: articles.map((a) => ({
                                id: a.id,
                                title: a.title,
                                slug: a.slug,
                                published: a.published,
                                publishedAt: a.publishedAt,
                                authorName: a.authorName,
                                category: a.category?.name || null,
                                tags: a.tags?.map((t) => t.name) || [],
                                excerpt: a.excerpt,
                                updatedAt: a.updatedAt,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to list blog articles: ${message}` }],
            };
        }
    });
    // 2. Get Single Blog Article
    server.tool('get_blog_article', 'Retrieve complete details and Markdown content of a blog article by ID', {
        id: z.string().min(1).describe('The unique article ID'),
    }, async ({ id }) => {
        try {
            const article = (await api.get(`/api/blog/admin/articles/${id}`));
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(article, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to get blog article: ${message}` }],
            };
        }
    });
    // 3. Create Blog Article
    server.tool('create_blog_article', 'Create a new blog article (draft or published) in Technical Heist with optional attached media IDs and cover image', {
        title: z.string().min(1).max(200).describe('Article headline or title'),
        content: z.string().min(1).describe('Full Markdown or text body of the article'),
        excerpt: z.string().max(500).optional().describe('Short summary or excerpt for listings and SEO'),
        published: z.boolean().optional().describe('Publish immediately (true) or save as draft (false, default)'),
        cover_image: z.string().url().optional().describe('Public URL for the article header/cover image'),
        category_id: z.string().optional().describe('Optional Category ID (use list_blog_categories to discover)'),
        tag_ids: z.array(z.string()).optional().describe('Optional list of Tag IDs (use list_blog_tags to discover)'),
        media_ids: z.array(z.string()).optional().describe('Optional list of uploaded Media IDs to attach to the article'),
    }, async ({ title, content, excerpt, published = false, cover_image, category_id, tag_ids, media_ids }) => {
        try {
            const payload = {
                title,
                content,
                excerpt: excerpt || '',
                published: !!published,
                coverImage: cover_image || '',
                categoryId: category_id || '',
                tagIds: tag_ids || [],
                mediaIds: media_ids || [],
            };
            const created = (await api.post('/api/blog/admin/articles', payload));
            return {
                content: [
                    {
                        type: 'text',
                        text: `Blog article created successfully!\n\n${JSON.stringify({
                            id: created.id,
                            title: created.title,
                            slug: created.slug,
                            published: created.published,
                            publishedAt: created.publishedAt,
                            author: created.authorName,
                        }, null, 2)}`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create blog article: ${message}` }],
            };
        }
    });
    // 4. Update Blog Article
    server.tool('update_blog_article', 'Update an existing blog article (modify title, body content, excerpt, published status, category, tags, or attached media)', {
        id: z.string().min(1).describe('The ID of the article to update'),
        title: z.string().min(1).max(200).optional().describe('New article title'),
        content: z.string().min(1).optional().describe('New article content in Markdown'),
        excerpt: z.string().max(500).optional().describe('New article excerpt'),
        published: z.boolean().optional().describe('Update published status (true to publish, false to unpublish)'),
        cover_image: z.string().url().optional().describe('New cover image URL'),
        category_id: z.string().optional().describe('New category ID'),
        tag_ids: z.array(z.string()).optional().describe('New list of tag IDs'),
        media_ids: z.array(z.string()).optional().describe('New list of uploaded Media IDs attached to the article'),
    }, async ({ id, title, content, excerpt, published, cover_image, category_id, tag_ids, media_ids }) => {
        try {
            // Fetch current article first to preserve existing fields if omitted
            const current = (await api.get(`/api/blog/admin/articles/${id}`));
            const payload = {
                title: title !== undefined ? title : current.title,
                content: content !== undefined ? content : current.content,
                excerpt: excerpt !== undefined ? excerpt : current.excerpt || '',
                published: published !== undefined ? published : current.published,
                coverImage: cover_image !== undefined ? cover_image : current.coverImage || '',
                categoryId: category_id !== undefined ? category_id : current.category?.id || '',
                tagIds: tag_ids !== undefined ? tag_ids : current.tags?.map((t) => t.id) || [],
                mediaIds: media_ids !== undefined ? media_ids : current.media?.map((m) => m.media_id) || [],
            };
            const updated = (await api.put(`/api/blog/admin/articles/${id}`, payload));
            return {
                content: [
                    {
                        type: 'text',
                        text: `Blog article updated successfully!\n\n${JSON.stringify({
                            id: updated.id,
                            title: updated.title,
                            slug: updated.slug,
                            published: updated.published,
                            updatedAt: updated.updatedAt,
                        }, null, 2)}`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to update blog article: ${message}` }],
            };
        }
    });
    // 5. Delete Blog Article
    server.tool('delete_blog_article', 'Permanently delete a blog article by ID', {
        id: z.string().min(1).describe('The ID of the article to delete'),
    }, async ({ id }) => {
        try {
            const res = await api.delete(`/api/blog/admin/articles/${id}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: res?.message || `Article ${id} deleted successfully.`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to delete blog article: ${message}` }],
            };
        }
    });
    // 6. Upload Blog Media (Images and Documentation Attachments)
    server.tool('upload_blog_media', 'Upload photos, images, diagrams, or documentation attachments (PDF, DOCX, TXT, JSON, Markdown, ZIP) for use in blog articles.', {
        file_path: z
            .string()
            .optional()
            .describe('Absolute or relative local file path to an image or document file on disk'),
        base64_data: z
            .string()
            .optional()
            .describe('Base64-encoded file content (useful when image/document data is generated in memory)'),
        content: z
            .string()
            .optional()
            .describe('Raw text or Markdown string content to upload as an attached documentation file'),
        filename: z
            .string()
            .optional()
            .describe('Target file name (e.g. "architecture-diagram.png" or "spec.pdf"). Required if using base64_data or content'),
        content_type: z
            .string()
            .optional()
            .describe('MIME type (e.g. "image/png", "application/pdf"). Automatically detected from filename extension if omitted'),
        alt: z
            .string()
            .optional()
            .describe('Optional alt text for images, or descriptive title for documentation attachments'),
    }, async ({ file_path, base64_data, content, filename, content_type, alt }) => {
        try {
            let buffer;
            let finalFilename = filename;
            if (file_path) {
                const resolvedPath = path.isAbsolute(file_path) ? file_path : path.resolve(process.cwd(), file_path);
                if (!fs.existsSync(resolvedPath)) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: `File not found at path: ${resolvedPath}` }],
                    };
                }
                buffer = fs.readFileSync(resolvedPath);
                if (!finalFilename) {
                    finalFilename = path.basename(resolvedPath);
                }
            }
            else if (base64_data) {
                if (!finalFilename) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'filename is required when using base64_data.' }],
                    };
                }
                const cleanBase64 = base64_data.replace(/^data:[^;]+;base64,/, '');
                buffer = Buffer.from(cleanBase64, 'base64');
            }
            else if (content !== undefined) {
                if (!finalFilename) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'filename is required when using content.' }],
                    };
                }
                buffer = Buffer.from(content, 'utf-8');
            }
            else {
                return {
                    isError: true,
                    content: [{ type: 'text', text: 'Either file_path, base64_data, or content must be provided to upload media.' }],
                };
            }
            const mime = inferMimeType(finalFilename, content_type);
            // Step 1: Request presigned upload URL from Technical Heist backend
            const presignRes = (await api.post('/api/blog/media/presign', {
                filename: finalFilename,
                contentType: mime,
                size: buffer.length,
            }));
            // Step 2: Upload file binary directly to the storage bucket via PUT
            const uploadRes = await fetch(presignRes.uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': mime,
                },
                body: new Uint8Array(buffer),
            });
            if (!uploadRes.ok) {
                const uploadText = await uploadRes.text();
                throw new Error(`Cloud storage binary upload failed (${uploadRes.status}): ${uploadText}`);
            }
            // Step 3: Register uploaded media record in database
            const registered = (await api.post('/api/blog/media', {
                key: presignRes.key,
                url: presignRes.publicUrl,
                filename: finalFilename,
                mimeType: mime,
                size: buffer.length,
                alt: alt || null,
            }));
            const isImage = mime.startsWith('image/');
            const markdownSnippet = isImage
                ? `![${alt || finalFilename}](${presignRes.publicUrl})`
                : `[${alt || finalFilename}](${presignRes.publicUrl})`;
            return {
                content: [
                    {
                        type: 'text',
                        text: `Media uploaded and registered successfully!\n\n${JSON.stringify({
                            id: registered.id,
                            filename: finalFilename,
                            url: presignRes.publicUrl,
                            mime_type: mime,
                            size_bytes: buffer.length,
                            alt: alt || null,
                            markdown_embed_snippet: markdownSnippet,
                            instruction: isImage
                                ? 'Use this URL in cover_image, or embed markdown_embed_snippet into your article content.'
                                : 'Embed markdown_embed_snippet into your article content as a downloadable documentation link, or pass id in media_ids.',
                        }, null, 2)}`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to upload blog media: ${message}` }],
            };
        }
    });
    // 7. List Blog Media
    server.tool('list_blog_media', 'List all uploaded media assets (photos, images, documents) available in the blog media library', {}, async () => {
        try {
            const res = (await api.get('/api/blog/media'));
            const mediaList = res.media || [];
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            count: mediaList.length,
                            media: mediaList.map((m) => ({
                                id: m.id,
                                filename: m.filename,
                                url: m.url,
                                mimeType: m.mimeType,
                                size: m.size,
                                alt: m.alt,
                                articleCount: m.articleCount,
                                createdAt: m.createdAt,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to list blog media: ${message}` }],
            };
        }
    });
    // 8. Delete Blog Media
    server.tool('delete_blog_media', 'Permanently delete an uploaded media asset or document attachment from the blog library by ID', {
        id: z.string().min(1).describe('The unique ID of the media item to delete'),
    }, async ({ id }) => {
        try {
            const res = await api.delete(`/api/blog/media/${id}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: res?.message || `Media item ${id} deleted successfully.`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to delete blog media: ${message}` }],
            };
        }
    });
    // 9. List Blog Categories
    server.tool('list_blog_categories', 'List all available blog categories with their IDs and article counts', {}, async () => {
        try {
            const res = (await api.get('/api/blog/admin/categories'));
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(res.categories || [], null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to list blog categories: ${message}` }],
            };
        }
    });
    // 10. List Blog Tags
    server.tool('list_blog_tags', 'List all available blog tags with their IDs and article counts', {}, async () => {
        try {
            const res = (await api.get('/api/blog/admin/tags'));
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(res.tags || [], null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to list blog tags: ${message}` }],
            };
        }
    });
}
