# Technical Heist MCP Server

[![Publish to GitHub Packages](https://github.com/technicalheist/technical-heist-mcp-server/actions/workflows/publish.yml/badge.svg)](https://github.com/technicalheist/technical-heist-mcp-server/actions/workflows/publish.yml)

Model Context Protocol (MCP) server providing programmatic access to the **Technical Heist** platform and encrypted vault.

## Features

- **Authentication Management**: Authenticate using your email/password via the `login` tool, or provide a pre-existing token with `TECHNICALHEIST_ACCESS_TOKEN`.
- **Automatic Token Refresh**: Automatically refreshes expired JWT tokens using the refresh token flow.
- **Encrypted Notes Operations**: Full CRUD for vault notes with transparent server-side decryption and encryption:
  - `list_notes`: List all decrypted notes with optional search or favorite filters.
  - `get_note`: Fetch a single note by ID.
  - `create_note`: Create a new encrypted note.
  - `update_note`: Update title, body, or favorite state.
  - `delete_note`: Delete a note.

## Installation from GitHub Packages

To install or run via `npx` from GitHub Packages, configure your npm registry for `@technicalheist`:

```bash
# In your ~/.npmrc:
@technicalheist:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

Run directly:
```bash
npx @technicalheist/technical-heist-mcp-server
```

## Running with MCP Clients

Add the server to your MCP configuration (Claude Desktop, Cursor, Antigravity, etc.):

```json
{
  "mcpServers": {
    "technical-heist": {
      "command": "npx",
      "args": [
        "-y",
        "@technicalheist/technical-heist-mcp-server"
      ],
      "env": {
        "TECHNICALHEIST_AUTH_URL": "https://auth.technicalheist.com",
        "TECHNICALHEIST_API_URL": "https://www.technicalheist.com"
      }
    }
  }
}
```

## Local Development & Build

```bash
cd technical-heist-mcp-server
npm install
npm run build
npm start
```

## Configuration Options

| Variable | Default | Description |
| :--- | :--- | :--- |
| `TECHNICALHEIST_AUTH_URL` | `https://auth.technicalheist.com` | Base URL for auth service |
| `TECHNICALHEIST_API_URL` | `https://www.technicalheist.com` | Base URL for API & vault service |
| `TECHNICALHEIST_ACCESS_TOKEN` | *(Optional)* | Pre-authenticated JWT access token |
| `TECHNICALHEIST_REFRESH_TOKEN` | *(Optional)* | Refresh token |

## Available Tools

- `login(email, password)`: Authenticate and store the access token in memory.
- `get_current_user()`: View active session details and user profile.
- `logout()`: Invalidate the active session.
- `list_notes(search?, favorites_only?)`: List notes.
- `get_note(id)`: Retrieve specific note content.
- `create_note(title, content)`: Add note to vault.
- `update_note(id, title?, content?, is_favorite?)`: Edit existing note.
- `delete_note(id)`: Remove note.
