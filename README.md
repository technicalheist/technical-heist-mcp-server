# Technical Heist MCP Server

[![Publish to GitHub Packages](https://github.com/technicalheist/technical-heist-mcp-server/actions/workflows/publish.yml/badge.svg)](https://github.com/technicalheist/technical-heist-mcp-server/actions/workflows/publish.yml)

Model Context Protocol (MCP) server providing programmatic access to the **Technical Heist** platform: encrypted notes, tasks/todos, 2FA authenticator (TOTP), and blog management.

## Features

- **Authentication Management**:
  - Headless **API Key** authentication via `TECHNICALHEIST_API_KEY` (0 popups, 0 prompts, sub-second startup).
  - Interactive Browser OAuth loopback and direct email/password login tools.
  - Automatic token generation and refresh.
- **Encrypted Notes Vault**: Full CRUD for vault notes with transparent server-side decryption and encryption (`list_notes`, `get_note`, `create_note`, `update_note`, `delete_note`).
- **Tasks & Todos**: Priority, status, and category-aware task management (`list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`).
- **2FA Authenticator (TOTP)**: Secure 2FA token generation with live 6-digit codes and expiration countdowns (`list_authenticator_accounts`, `get_totp_code`, `create_authenticator_account`, `delete_authenticator_account`).
- **Blog Content Management**: Author, draft, publish, update, and organize articles with categories and tags (`list_blog_articles`, `get_blog_article`, `create_blog_article`, `update_blog_article`, `delete_blog_article`, `list_blog_categories`, `list_blog_tags`).

## Security & Privacy Scope

By design, this MCP server enforces strict boundaries regarding sensitive user data:
- **Included**: Authenticated user session management, **Encrypted Notes**, **Tasks/Todos**, **2FA Authenticator (TOTP)**, and **Blog Management**.
- **Excluded by Policy**: **Passwords Vault** and **Financial Accounts & Transactions** are deliberately excluded. AI agents are strictly prohibited from accessing, viewing, or managing financial or master password data.

## Running with MCP Clients (Headless with API Key)

Add `TECHNICALHEIST_API_KEY` to your MCP configuration for instant, headless authentication:

```json
{
  "mcpServers": {
    "technical-heist": {
      "command": "node",
      "args": [
        "/Users/nix/Documents/Projects/TechnicalHeist-App/technical-heist-mcp-server/dist/index.js"
      ],
      "env": {
        "TECHNICALHEIST_AUTH_URL": "https://auth.technicalheist.com",
        "TECHNICALHEIST_API_URL": "https://www.technicalheist.com",
        "TECHNICALHEIST_API_KEY": "th_live_your_key_here"
      }
    }
  }
}
```

Or using `npx`:

```json
{
  "mcpServers": {
    "technical-heist": {
      "command": "npx",
      "args": [
        "-y",
        "github:technicalheist/technical-heist-mcp-server"
      ],
      "env": {
        "TECHNICALHEIST_AUTH_URL": "https://auth.technicalheist.com",
        "TECHNICALHEIST_API_URL": "https://www.technicalheist.com",
        "TECHNICALHEIST_API_KEY": "th_live_your_key_here"
      }
    }
  }
}
```

## Available Tools (24 Tools)

### Authentication
- `login(api_key?, email?, password?)`: Authenticate and store access token.
- `get_current_user()`: View active session details and user profile.
- `logout()`: Invalidate active session.

### Notes Vault
- `list_notes(search?, favorites_only?)`: List decrypted notes with search and favorite filters.
- `get_note(id)`: Retrieve specific note content.
- `create_note(title, content)`: Add note to vault.
- `update_note(id, title?, content?, is_favorite?)`: Edit existing note.
- `delete_note(id)`: Remove note from vault.

### Tasks (Todos)
- `list_tasks(is_completed?, category?, priority?, search?)`: Query tasks with multi-dimensional filtering.
- `get_task(id)`: Fetch single task by ID.
- `create_task(title, priority?, category?, is_completed?)`: Add new task.
- `update_task(id, title?, is_completed?, priority?, category?)`: Update status or metadata.
- `delete_task(id)`: Permanently delete task.

### Authenticator (2FA / TOTP)
- `list_authenticator_accounts(search?, reveal_secrets?)`: List all 2FA accounts with live 6-digit codes and expiration countdowns.
- `get_totp_code(id_or_service)`: Generate instant live 6-digit TOTP code for a service (e.g. "GitHub", "AWS").
- `create_authenticator_account(service_name, account_name, secret)`: Add new 2FA Base32 secret.
- `delete_authenticator_account(id)`: Remove 2FA secret from vault.

### Blog Management
- `list_blog_articles(status?, page?, limit?, search?)`: List articles by publication state (published, draft, all).
- `get_blog_article(id)`: Retrieve full article markdown and metadata.
- `create_blog_article(title, content, excerpt?, published?, cover_image?, category_id?, tag_ids?)`: Author a new article.
- `update_blog_article(id, title?, content?, excerpt?, published?, cover_image?, category_id?, tag_ids?)`: Modify article content or status.
- `delete_blog_article(id)`: Delete article.
- `list_blog_categories()`: Discover categories for tagging articles.
- `list_blog_tags()`: Discover tags for labeling articles.

## Local Development & Build

```bash
cd technical-heist-mcp-server
npm install
npm run build
npm start
```

## License

MIT
