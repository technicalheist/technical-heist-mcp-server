#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAuthTools } from './tools/auth.js';
import { registerNotesTools } from './tools/notes.js';
import { registerTasksTools } from './tools/tasks.js';
import { registerAuthenticatorTools } from './tools/authenticator.js';
import { registerBlogTools } from './tools/blog.js';
import { registerDocsTools } from './tools/docs.js';
async function main() {
    const server = new McpServer({
        name: 'technical-heist',
        version: '1.0.4',
    });
    // Register available tools
    registerAuthTools(server);
    registerNotesTools(server);
    registerTasksTools(server);
    registerAuthenticatorTools(server);
    registerBlogTools(server);
    registerDocsTools(server);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[technical-heist-mcp-server] Server running on stdio');
}
main().catch((err) => {
    console.error('[technical-heist-mcp-server] Fatal error:', err);
    process.exit(1);
});
