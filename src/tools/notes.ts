import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { api, ApiError } from '../api.js';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  is_favorite?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function registerNotesTools(server: McpServer): void {
  // List Notes
  server.tool(
    'list_notes',
    'List all decrypted notes from the Technical Heist vault, with optional search and favorite filtering',
    {
      search: z.string().optional().describe('Optional keyword to filter notes by title or content'),
      favorites_only: z.boolean().optional().describe('If true, only returns notes marked as favorite'),
    },
    async ({ search, favorites_only }) => {
      try {
        const notes = (await api.get('/api/notes')) as NoteItem[];

        let filtered = Array.isArray(notes) ? notes : [];

        if (favorites_only) {
          filtered = filtered.filter((n) => !!n.is_favorite);
        }

        if (search && search.trim()) {
          const query = search.toLowerCase().trim();
          filtered = filtered.filter(
            (n) =>
              (n.title && n.title.toLowerCase().includes(query)) ||
              (n.content && n.content.toLowerCase().includes(query))
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: filtered.length,
                  notes: filtered,
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
          content: [{ type: 'text', text: `Failed to list notes: ${message}` }],
        };
      }
    }
  );

  // Get Single Note by ID
  server.tool(
    'get_note',
    'Retrieve a specific decrypted note by its ID',
    {
      id: z.string().min(1).describe('The unique note ID'),
    },
    async ({ id }) => {
      try {
        const notes = (await api.get('/api/notes')) as NoteItem[];
        const note = Array.isArray(notes) ? notes.find((n) => n.id === id) : null;

        if (!note) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Note with ID "${id}" was not found.` }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(note, null, 2),
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get note: ${message}` }],
        };
      }
    }
  );

  // Create Note
  server.tool(
    'create_note',
    'Create a new encrypted note in the Technical Heist vault',
    {
      title: z.string().min(1).describe('The title of the note'),
      content: z.string().min(1).describe('The note body or content (supports Markdown/plain text)'),
    },
    async ({ title, content }) => {
      try {
        const newNote = (await api.post('/api/notes', {
          title,
          content,
        })) as NoteItem;

        return {
          content: [
            {
              type: 'text',
              text: `Note created successfully!\n\n${JSON.stringify(newNote, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create note: ${message}` }],
        };
      }
    }
  );

  // Update Note
  server.tool(
    'update_note',
    'Update an existing note in the Technical Heist vault (title, content, or favorite status)',
    {
      id: z.string().min(1).describe('The ID of the note to update'),
      title: z.string().optional().describe('New title of the note'),
      content: z.string().optional().describe('New content of the note'),
      is_favorite: z.boolean().optional().describe('Mark or unmark note as favorite'),
    },
    async ({ id, title, content, is_favorite }) => {
      try {
        const body: Record<string, any> = {};
        if (title !== undefined) body.title = title;
        if (content !== undefined) body.content = content;
        if (is_favorite !== undefined) body.is_favorite = is_favorite;

        const updatedNote = (await api.put(`/api/notes/${id}`, body)) as NoteItem;

        return {
          content: [
            {
              type: 'text',
              text: `Note updated successfully!\n\n${JSON.stringify(updatedNote, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update note: ${message}` }],
        };
      }
    }
  );

  // Delete Note
  server.tool(
    'delete_note',
    'Permanently delete a note from the Technical Heist vault by ID',
    {
      id: z.string().min(1).describe('The ID of the note to delete'),
    },
    async ({ id }) => {
      try {
        const res = await api.delete(`/api/notes/${id}`);
        return {
          content: [
            {
              type: 'text',
              text: res?.message || `Note ${id} deleted successfully.`,
            },
          ],
        };
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : String(err?.message || err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to delete note: ${message}` }],
        };
      }
    }
  );
}
