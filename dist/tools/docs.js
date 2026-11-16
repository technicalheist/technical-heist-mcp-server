import { z } from 'zod';
import { api, ApiError } from '../api.js';
export function registerDocsTools(server) {
    // 1. List Docs (Tree)
    server.tool('list_docs', 'List the document tree (folders and files) for the authenticated user with strict tenant isolation. Only documentation belonging to the authenticated account is returned.', {
        subfolder: z
            .string()
            .optional()
            .describe('Optional subfolder path to filter documents (e.g. "architecture" or "guides")'),
    }, async ({ subfolder }) => {
        try {
            const tree = (await api.get('/api/docs/tree'));
            let result = Array.isArray(tree) ? tree : [];
            if (subfolder && subfolder.trim()) {
                const cleanSub = subfolder.replace(/^\/+|\/+$/g, '').toLowerCase();
                const findInTree = (nodes) => {
                    for (const node of nodes) {
                        if (node.type === 'folder' && node.path.toLowerCase() === cleanSub) {
                            return node.children || [];
                        }
                        if (node.children) {
                            const found = findInTree(node.children);
                            if (found.length > 0)
                                return found;
                        }
                    }
                    return [];
                };
                result = findInTree(result);
            }
            const countNodes = (nodes) => {
                let files = 0;
                let folders = 0;
                for (const n of nodes) {
                    if (n.type === 'file')
                        files++;
                    if (n.type === 'folder') {
                        folders++;
                        if (n.children) {
                            const sub = countNodes(n.children);
                            files += sub.files;
                            folders += sub.folders;
                        }
                    }
                }
                return { files, folders };
            };
            const counts = countNodes(result);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            tenant_isolation: 'Enforced (Scoped strictly to authenticated user workspace)',
                            total_files: counts.files,
                            total_folders: counts.folders,
                            tree: result,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to list documents: ${message}` }],
            };
        }
    });
    // 2. Get Single Doc
    server.tool('get_doc', 'Retrieve the text or Markdown content of a document by relative path within the authenticated user isolated documentation workspace.', {
        path: z
            .string()
            .min(1)
            .describe('Relative path of the document (e.g. "architecture/overview.md" or "notes.txt")'),
        raw: z
            .boolean()
            .optional()
            .describe('Whether to return raw text content directly (defaults to true)'),
    }, async ({ path: docPath, raw = true }) => {
        try {
            const cleanPath = docPath.replace(/^\/+|\/+$/g, '');
            const query = raw ? '?raw=1' : '';
            const res = await api.get(`/api/docs/file/${cleanPath}${query}`);
            const textContent = typeof res === 'string' ? res : (res && res.text) || JSON.stringify(res, null, 2);
            return {
                content: [
                    {
                        type: 'text',
                        text: textContent,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to get document "${docPath}": ${message}` }],
            };
        }
    });
    // 3. Create Doc or Folder
    server.tool('create_doc', 'Create a new document or folder in the authenticated user isolated documentation workspace.', {
        path: z
            .string()
            .min(1)
            .describe('Relative path for the new item (e.g. "specs/api-spec.md" or "blueprints")'),
        type: z
            .enum(['file', 'folder'])
            .optional()
            .describe('Type of item to create: "file" (default) or "folder"'),
        content: z
            .string()
            .optional()
            .describe('Initial text or Markdown content to write to the file'),
    }, async ({ path: reqPath, type = 'file', content }) => {
        try {
            const cleanPath = reqPath.replace(/^\/+|\/+$/g, '');
            await api.post('/api/docs/files', {
                reqPath: cleanPath,
                type,
            });
            if (type === 'file' && content !== undefined) {
                await api.put('/api/docs/files', {
                    reqPath: cleanPath,
                    content,
                });
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully created ${type} "${cleanPath}" in authenticated user documentation workspace.`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create ${type} "${reqPath}": ${message}` }],
            };
        }
    });
    // 4. Update Doc Content
    server.tool('update_doc', 'Update or overwrite the text or Markdown content of an existing document in the authenticated user isolated workspace.', {
        path: z
            .string()
            .min(1)
            .describe('Relative path of the document to update (e.g. "architecture/overview.md")'),
        content: z.string().describe('Full updated text or Markdown content'),
    }, async ({ path: reqPath, content }) => {
        try {
            const cleanPath = reqPath.replace(/^\/+|\/+$/g, '');
            await api.put('/api/docs/files', {
                reqPath: cleanPath,
                content,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Document "${cleanPath}" updated successfully.`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to update document "${reqPath}": ${message}` }],
            };
        }
    });
    // 5. Rename or Move Doc / Folder
    server.tool('rename_doc', 'Rename or move a document or folder within the authenticated user isolated documentation workspace.', {
        old_path: z.string().min(1).describe('Current relative path of the file or folder'),
        new_path: z.string().min(1).describe('New relative path of the file or folder'),
    }, async ({ old_path, new_path }) => {
        try {
            const cleanOld = old_path.replace(/^\/+|\/+$/g, '');
            const cleanNew = new_path.replace(/^\/+|\/+$/g, '');
            await api.patch('/api/docs/files/rename', {
                oldPath: cleanOld,
                newPath: cleanNew,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully moved/renamed "${cleanOld}" to "${cleanNew}".`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to rename "${old_path}": ${message}` }],
            };
        }
    });
    // 6. Delete Doc or Folder
    server.tool('delete_doc', 'Permanently delete a document or an entire folder tree from the authenticated user isolated workspace.', {
        path: z.string().min(1).describe('Relative path of the document or folder to delete'),
    }, async ({ path: reqPath }) => {
        try {
            const cleanPath = reqPath.replace(/^\/+|\/+$/g, '');
            await api.delete('/api/docs/files', {
                reqPath: cleanPath,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Document or folder "${cleanPath}" deleted successfully.`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to delete "${reqPath}": ${message}` }],
            };
        }
    });
}
