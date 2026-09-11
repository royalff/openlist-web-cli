# OpenList CLI Web Client (命令行网页客户端)

[English Documentation](./README.md)

这是一个专门为 [OpenList](https://github.com/OpenListTeam/openlist) 打造的 Web 命令行（CLI）客户端。

虽然 OpenList 已经提供了一个非常优秀的 WebUI，但本项目旨在把最纯粹的终端（Terminal）体验带到浏览器中。你可以直接通过输入命令来管理文件、浏览目录，甚至使用内置的 `nano` 和 `vim` 编辑器直接修改文件。

## ✨ 特性 (Features)

- **全栈代理架构**：内置 Express 代理服务器，完美绕过浏览器 CORS 跨域限制。
- **高仿终端 UI**：纯正的终端交互体验，支持上下方向键切换历史命令、路径自动解析，以及带颜色高亮的文件输出。
- **高级文件管理**：支持类似 Linux 和 rclone 的指令，例如 `ls -R`（递归列出）、`cd`、`mkdir`、`rm`、`rename`、`copy` 和 `moveto`。
- **内置文本编辑器**：Web 端原生实现 `nano` 和 `vim` 克隆版本，支持直接在终端内编辑远程文本文件。
- **文件传输**：支持本地与服务器之间的文件上传 (`put`) 与下载 (`get`)，后台已配置允许最大 500MB 的文件上传负载。
- **智能登录与缓存**：交互式的账号密码输入（密码隐式输入），支持记住密码并在下次访问时自动登录。提供 `logout` 指令用于在公共环境一键销毁缓存。
- **搜索与空间计算**：支持全局搜索 (`search`) 以及精准的文件/文件夹大小统计 (`size` / `ncdu`)。

## 🚀 部署教程 (Deployment)

### 方案 1: 使用 Docker 部署 (推荐)

最简单、最干净的部署方式。

```bash
# 1. 克隆代码库
git clone https://github.com/YourUsername/openlist-cli-web.git
cd openlist-cli-web

# 2. 构建 Docker 镜像
docker build -t openlist-cli .

# 3. 运行容器
docker run -d -p 3000:3000 --name openlist-cli openlist-cli
```
部署完成后，浏览器访问 `http://localhost:3000` 即可使用。

### 方案 2: Node.js 手动部署

需要你的环境安装有 **Node.js 18+**。

```bash
# 1. 克隆代码库
git clone https://github.com/YourUsername/openlist-cli-web.git
cd openlist-cli-web

# 2. 安装项目依赖
npm install

# 3. 执行生产环境构建
npm run build

# 4. 启动服务器
npm start
```
服务默认监听在 `0.0.0.0:3000`。

## 🛠️ 使用说明 (Commands)

进入 Web 终端后，你可以使用以下指令：

### 连接与认证
- `connect <url>`: 连接到指定的 OpenList 服务器 (例如: `connect http://localhost:5244`)。
- `login [username]`: 交互式安全登录。输入密码时字符会被隐藏，登录成功后可选择是否记住账号密码。
- `logout`: 登出并清空浏览器中所有缓存的凭证（适合网吧等不安全环境）。
- `status`: 查看当前的连接状态和路径。

### 导航与查看
- `pwd`: 打印当前工作目录。
- `cd <path>`: 切换目录。
- `ls [-R] [path]`: 列出当前或指定目录的文件。加上 `-R` 参数可以递归显示子目录树。
- `search <keyword>`: 全局搜索包含关键字的文件。
- `df`: 列出所有挂载的存储驱动器。
- `size <path>` (或 `ncdu <path>`): 获取指定文件或目录的直观总大小统计。

### 文件操作
- `mkdir <path>`: 创建新目录。
- `rm <name>` (或 `rmdir`): 删除文件或目录。
- `rename <old> <new>`: 重命名文件/目录。
- `copy <src> <dest_dir>`: 复制文件到目标目录。
- `moveto <src> <dest_dir>`: 移动文件到目标目录。

### 阅读与编辑
- `cat <name>`: 在终端内打印文本文件的完整内容。
- `nano <name>` 或 `vim <name>`: 打开全屏文本编辑器。如果指定的文件不存在，它会自动创建一个空文件供你编辑。使用 `Ctrl + X` 保存并退出。

### 文件传输
- `get <name>`: 下载指定文件到你的本地电脑。
- `put`: 唤起本地文件选择器，将你选择的文件上传至终端当前所在的目录。
- `link <name>`: 获取某个文件的直链（Direct Link）。

## 💻 本地开发 (Development)

如果你想对本项目进行二开或调试：

```bash
npm install
npm run dev
```

该命令会同时启动 Vite 前端热更新服务和 Express 后端代理服务器。

## 📄 开源协议
本项目基于 MIT License 开源，详见 [LICENSE](LICENSE) 文件。
