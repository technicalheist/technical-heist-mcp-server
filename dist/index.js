#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAuthTools } from './tools/auth.js';
import { registerNotesTools } from './tools/notes.js';
async function main() {
    const server = new McpServer({
        name: 'technical-heist',
        version: '1.0.0',
    });
    // Register available tools
    registerAuthTools(server);
    registerNotesTools(server);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[technical-heist-mcp-server] Server running on stdio');
}
main().catch((err) => {
    console.error('[technical-heist-mcp-server] Fatal error:', err);
    process.exit(1);
});
