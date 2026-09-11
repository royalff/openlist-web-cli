# OpenList CLI Web Client

[中文说明 / Chinese Documentation](./README_zh.md)

A highly interactive, web-based Command Line Interface (CLI) client for [OpenList](https://github.com/OpenListTeam/openlist).

While OpenList provides an excellent standard WebUI, this project brings a true terminal emulator experience directly to your browser. You can manage files, explore directories, and even use built-in editors like `nano` and `vim`—all via typing commands.

## ✨ Features

- **Full-Stack Proxy Architecture**: Bypasses browser CORS restrictions by routing OpenList API requests through an integrated Express server.
- **Terminal UI (TUI)**: Authentic terminal design with command history (Up/Down arrow keys), `cd` path auto-resolution, and color-coded file output.
- **Advanced File Management**: Support for `ls -R` (recursive list), `cd`, `mkdir`, `rm`, `rename`, `copy`, and `moveto`.
- **Built-in Code Editors**: Directly edit your remote files using interactive `nano` and `vim` clones right from the web terminal.
- **File Transfers**: Upload (`put`) and download (`get`) files natively. Supports uploading large files up to 500MB via proxy.
- **Smart Login & Caching**: Interactive step-by-step authentication with support for saving credentials securely in browser local storage. Auto-logins on subsequent visits.
- **Search & Metrics**: Perform deep keyword searches (`search`) and calculate exact file/directory sizes instantly (`size` / `ncdu`).

## 🚀 Deployment

### Option 1: Docker (Recommended)

The easiest way to deploy the application is using Docker.

```bash
# 1. Clone the repository
git clone https://github.com/YourUsername/openlist-cli-web.git
cd openlist-cli-web

# 2. Build the Docker image
docker build -t openlist-cli .

# 3. Run the container
docker run -d -p 3000:3000 --name openlist-cli openlist-cli
```
The CLI will now be available at `http://localhost:3000`.

### Option 2: Manual Node.js Deployment

Requires **Node.js 18+**.

```bash
# 1. Clone the repository
git clone https://github.com/YourUsername/openlist-cli-web.git
cd openlist-cli-web

# 2. Install dependencies
npm install

# 3. Build the frontend and backend server
npm run build

# 4. Start the production server
npm start
```
The application will listen on `0.0.0.0:3000`.

## 🛠️ Usage & Available Commands

Once you open the web terminal, here are the commands you can use:

### Connection & Auth
- `connect <url>`: Connect to an OpenList server (e.g., `connect http://localhost:5244`).
- `login [username]`: Authenticate securely. The terminal will prompt for your password and ask if you want to remember credentials.
- `logout`: Clear your active session and wipe cached credentials from the browser.
- `status`: Show current connection status and active directory.

### Navigation & Discovery
- `pwd`: Print the current working directory.
- `cd <path>`: Change directory.
- `ls [-R] [path]`: List files and directories. Use `-R` for recursive tree listing.
- `search <keyword>`: Search for files globally.
- `df`: List all mounted storage drives.
- `size <path>` (or `ncdu <path>`): Get the human-readable total byte size of a file or directory.

### File Manipulation
- `mkdir <path>`: Create a new directory.
- `rm <name>` (or `rmdir`): Remove a file or directory.
- `rename <old> <new>`: Rename an item.
- `copy <src> <dest_dir>`: Copy an item.
- `moveto <src> <dest_dir>`: Move an item to a new directory.

### Reading & Editing
- `cat <name>`: Print the raw contents of a text file into the terminal.
- `nano <name>` or `vim <name>`: Opens a full-screen text editor interface. If the file doesn't exist, it creates a new one. Press `Ctrl + X` to save and exit.

### File Transfers
- `get <name>`: Download the file to your local machine.
- `put`: Opens a file picker prompt to upload a local file to the current working directory.
- `link <name>`: Gets a direct download URL for the file.

## 💻 Development

If you want to contribute or modify the project:

```bash
npm install
npm run dev
```

This will boot the Vite frontend and Express server concurrently in development mode.

## 📄 License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
