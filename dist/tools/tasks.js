import { z } from 'zod';
import { api, ApiError } from '../api.js';
export function registerTasksTools(server) {
    // 1. List Tasks
    server.tool('list_tasks', 'List tasks and todos from Technical Heist, with optional filters for status, category, priority, and search', {
        is_completed: z
            .boolean()
            .optional()
            .describe('Filter by completion status: true for completed, false for pending'),
        category: z.string().optional().describe('Filter by category name (e.g. "General", "Work")'),
        priority: z
            .enum(['low', 'medium', 'high'])
            .optional()
            .describe('Filter by priority level'),
        search: z.string().optional().describe('Search keyword to filter task titles'),
    }, async ({ is_completed, category, priority, search }) => {
        try {
            const tasks = (await api.get('/api/todos'));
            let filtered = Array.isArray(tasks) ? tasks : [];
            if (is_completed !== undefined) {
                filtered = filtered.filter((t) => !!t.is_completed === is_completed);
            }
            if (category && category.trim()) {
                const cat = category.toLowerCase().trim();
                filtered = filtered.filter((t) => t.category && t.category.toLowerCase() === cat);
            }
            if (priority) {
                filtered = filtered.filter((t) => t.priority && t.priority.toLowerCase() === priority);
            }
            if (search && search.trim()) {
                const query = search.toLowerCase().trim();
                filtered = filtered.filter((t) => t.title && t.title.toLowerCase().includes(query));
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            count: filtered.length,
                            tasks: filtered,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to list tasks: ${message}` }],
            };
        }
    });
    // 2. Get Single Task
    server.tool('get_task', 'Retrieve a single task or todo item by its unique ID', {
        id: z.string().min(1).describe('The unique task ID'),
    }, async ({ id }) => {
        try {
            const tasks = (await api.get('/api/todos'));
            const task = Array.isArray(tasks) ? tasks.find((t) => t.id === id) : null;
            if (!task) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Task with ID "${id}" was not found.` }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(task, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to get task: ${message}` }],
            };
        }
    });
    // 3. Create Task
    server.tool('create_task', 'Create a new task or todo in Technical Heist', {
        title: z.string().min(1).describe('The task title or description'),
        priority: z
            .enum(['low', 'medium', 'high'])
            .optional()
            .describe('Priority level (defaults to "medium")'),
        category: z.string().optional().describe('Category name (defaults to "General")'),
        is_completed: z.boolean().optional().describe('Initial completion state (defaults to false)'),
    }, async ({ title, priority, category, is_completed }) => {
        try {
            const payload = {
                title,
                priority: priority || 'medium',
                category: category || 'General',
                is_completed: !!is_completed,
            };
            const newTask = (await api.post('/api/todos', payload));
            return {
                content: [
                    {
                        type: 'text',
                        text: `Task created successfully!\n\n${JSON.stringify(newTask, null, 2)}`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create task: ${message}` }],
            };
        }
    });
    // 4. Update Task
    server.tool('update_task', 'Update an existing task or todo (change title, toggle completed status, update priority or category)', {
        id: z.string().min(1).describe('The ID of the task to update'),
        title: z.string().optional().describe('New task title'),
        is_completed: z.boolean().optional().describe('Set task completion state'),
        priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority level'),
        category: z.string().optional().describe('New category name'),
    }, async ({ id, title, is_completed, priority, category }) => {
        try {
            const payload = {};
            if (title !== undefined)
                payload.title = title;
            if (is_completed !== undefined)
                payload.is_completed = is_completed;
            if (priority !== undefined)
                payload.priority = priority;
            if (category !== undefined)
                payload.category = category;
            const updated = (await api.put(`/api/todos/${id}`, payload));
            return {
                content: [
                    {
                        type: 'text',
                        text: `Task updated successfully!\n\n${JSON.stringify(updated, null, 2)}`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to update task: ${message}` }],
            };
        }
    });
    // 5. Delete Task
    server.tool('delete_task', 'Permanently delete a task or todo from Technical Heist by ID', {
        id: z.string().min(1).describe('The ID of the task to delete'),
    }, async ({ id }) => {
        try {
            const res = await api.delete(`/api/todos/${id}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: res?.message || `Task ${id} deleted successfully.`,
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof ApiError ? err.message : String(err?.message || err);
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to delete task: ${message}` }],
            };
        }
    });
}
