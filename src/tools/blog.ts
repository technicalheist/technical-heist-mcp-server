import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { api, ApiError } from '../api.js';

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
  category?: { id: string; name: string; slug: string } | null;
  tags?: Array<{ id: string; name: string; slug: string }>;
}

export function registerBlogTools(server: McpServer): void {
  // 1. List Blog Articles
  server.tool(
    'list_blog_articles',
    'List blog articles from Technical Heist with pagination, status filtering (published/draft), and optional keyword search',
    {
      status: z
        .enum(['all', 'published', 'draft'])
        .optional()
        .describe('Filter articles by publication status (defaults to "all")'),
      page: z.number().int().positive().optional().describe('Page number (defaults to 1)'),
      limit: z.number().int().positive().max(50).optional().describe('Number of articles per page (defaults to 20)'),
      search: z.string().optional().describe('Keyword to search across article titles, excerpts, and content'),
    },
    async ({ status = 'all', page = 1, limit = 20, search }) => {
      try {
        const queryParams = new URLSearchParams({
          status,
          page: String(page),
          limit: String(limit),
        });

        const res = (await api.get(`/api/blog/admin/articles?${queryParams.toString()}`)) as {
          articles: ArticleItem[];
          pagination: any;
        };

        let articles = res.articles || [];
        if (search && search.trim()) {
          const q = search.toLowerCase().trim();
          articles = articles.filter(
            (a) =>
              (a.title && a.title.toLowerCase().includes(q)) ||
              (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
              (a.content && a.content.toLowerCase().includes(q))
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list blog articles: ${message}` }],
        };
      }
    }
  );

  // 2. Get Single Blog Article
  server.tool(
    'get_blog_article',
    'Retrieve complete details and Markdown content of a blog article by ID',
    {
      id: z.string().min(1).describe('The unique article ID'),
    },
    async ({ id }) => {
      try {
        const article = (await api.get(`/api/blog/admin/articles/${id}`)) as ArticleItem;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(article, null, 2),
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get blog article: ${message}` }],
        };
      }
    }
  );

  // 3. Create Blog Article
  server.tool(
    'create_blog_article',
    'Create a new blog article (draft or published) in Technical Heist',
    {
      title: z.string().min(1).max(200).describe('Article headline or title'),
      content: z.string().min(1).describe('Full Markdown or text body of the article'),
      excerpt: z.string().max(500).optional().describe('Short summary or excerpt for listings and SEO'),
      published: z.boolean().optional().describe('Publish immediately (true) or save as draft (false, default)'),
      cover_image: z.string().url().optional().describe('Public URL for the article header/cover image'),
      category_id: z.string().optional().describe('Optional Category ID (use list_blog_categories to discover)'),
      tag_ids: z.array(z.string()).optional().describe('Optional list of Tag IDs (use list_blog_tags to discover)'),
    },
    async ({ title, content, excerpt, published = false, cover_image, category_id, tag_ids }) => {
      try {
        const payload: Record<string, any> = {
          title,
          content,
          excerpt: excerpt || '',
          published: !!published,
          coverImage: cover_image || '',
          categoryId: category_id || '',
          tagIds: tag_ids || [],
        };

        const created = (await api.post('/api/blog/admin/articles', payload)) as ArticleItem;

        return {
          content: [
            {
              type: 'text',
              text: `Blog article created successfully!\n\n${JSON.stringify(
                {
                  id: created.id,
                  title: created.title,
                  slug: created.slug,
                  published: created.published,
                  publishedAt: created.publishedAt,
                  author: created.authorName,
                },
                null,
                2
              )}`,
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create blog article: ${message}` }],
        };
      }
    }
  );

  // 4. Update Blog Article
  server.tool(
    'update_blog_article',
    'Update an existing blog article (modify title, body content, excerpt, published status, category, or tags)',
    {
      id: z.string().min(1).describe('The ID of the article to update'),
      title: z.string().min(1).max(200).optional().describe('New article title'),
      content: z.string().min(1).optional().describe('New article content in Markdown'),
      excerpt: z.string().max(500).optional().describe('New article excerpt'),
      published: z.boolean().optional().describe('Update published status (true to publish, false to unpublish)'),
      cover_image: z.string().url().optional().describe('New cover image URL'),
      category_id: z.string().optional().describe('New category ID'),
      tag_ids: z.array(z.string()).optional().describe('New list of tag IDs'),
    },
    async ({ id, title, content, excerpt, published, cover_image, category_id, tag_ids }) => {
      try {
        // Fetch current article first to preserve existing fields if omitted
        const current = (await api.get(`/api/blog/admin/articles/${id}`)) as ArticleItem;

        const payload: Record<string, any> = {
          title: title !== undefined ? title : current.title,
          content: content !== undefined ? content : current.content,
          excerpt: excerpt !== undefined ? excerpt : current.excerpt || '',
          published: published !== undefined ? published : current.published,
          coverImage: cover_image !== undefined ? cover_image : current.coverImage || '',
          categoryId: category_id !== undefined ? category_id : current.category?.id || '',
          tagIds: tag_ids !== undefined ? tag_ids : current.tags?.map((t) => t.id) || [],
        };

        const updated = (await api.put(`/api/blog/admin/articles/${id}`, payload)) as ArticleItem;

        return {
          content: [
            {
              type: 'text',
              text: `Blog article updated successfully!\n\n${JSON.stringify(
                {
                  id: updated.id,
                  title: updated.title,
                  slug: updated.slug,
                  published: updated.published,
                  updatedAt: updated.updatedAt,
                },
                null,
                2
              )}`,
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update blog article: ${message}` }],
        };
      }
    }
  );

  // 5. Delete Blog Article
  server.tool(
    'delete_blog_article',
    'Permanently delete a blog article by ID',
    {
      id: z.string().min(1).describe('The ID of the article to delete'),
    },
    async ({ id }) => {
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
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to delete blog article: ${message}` }],
        };
      }
    }
  );

  // 6. List Blog Categories
  server.tool(
    'list_blog_categories',
    'List all available blog categories with their IDs and article counts',
    {},
    async () => {
      try {
        const res = (await api.get('/api/blog/admin/categories')) as { categories: any[] };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.categories || [], null, 2),
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list blog categories: ${message}` }],
        };
      }
    }
  );

  // 7. List Blog Tags
  server.tool(
    'list_blog_tags',
    'List all available blog tags with their IDs and article counts',
    {},
    async () => {
      try {
        const res = (await api.get('/api/blog/admin/tags')) as { tags: any[] };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.tags || [], null, 2),
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list blog tags: ${message}` }],
        };
      }
    }
  );
}
