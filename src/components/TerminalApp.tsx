import React, { useState, useEffect, useRef } from 'react';
import { proxyRequest, proxyUpload } from '../lib/api';

type LineType = 'input' | 'output' | 'error' | 'system' | 'prompt';

interface TerminalLine {
  id: string;
  text: string;
  type: LineType;
  promptInfo?: {
    pwd: string;
    server: string;
  };
}

export function TerminalApp() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection State
  const [serverUrl, setServerUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [pwd, setPwd] = useState<string>('/');
  
  // Interactive Prompts
  type SessionStep = 'none' | 'username' | 'password' | 'rememberUser' | 'rememberPass';
  const [sessionPrompt, setSessionPrompt] = useState<{ step: SessionStep, username?: string, password?: string, rememberUser?: boolean }>({ step: 'none' });
  
  // Editor Overlay
  const [editor, setEditor] = useState<{ active: boolean, type: 'nano'|'vim', path: string, content: string } | null>(null);

  const printLine = (text: string, type: LineType = 'output') => {
    setLines(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  const clearTerminal = () => {
    setLines([]);
  };

  useEffect(() => {
    const init = async () => {
       const saved = localStorage.getItem('openlist_auth');
       if (saved) {
         try {
           const parsed = JSON.parse(saved);
           if (parsed.serverUrl && parsed.username && parsed.password) {
              setServerUrl(parsed.serverUrl);
              printLine(`Auto-connecting to ${parsed.serverUrl}...`, 'system');
              const loginRes = await proxyRequest(`${parsed.serverUrl}/api/auth/login`, 'POST', {}, {
                username: parsed.username,
                password: parsed.password
              });
              if (loginRes.code === 200) {
                 setToken(loginRes.data.token);
                 printLine(`Auto-login successful as ${parsed.username}.`, 'system');
              } else {
                 printLine(`Auto-login failed: ${loginRes.message}`, 'error');
                 localStorage.removeItem('openlist_auth');
              }
           } else if (parsed.serverUrl) {
              setServerUrl(parsed.serverUrl);
              printLine(`Restored connection to ${parsed.serverUrl}`, 'system');
              printLine('Type "login" to authenticate.', 'system');
           }
         } catch(e){}
       } else {
          printLine('Welcome to OpenList CLI.', 'system');
          printLine('Type "help" for a list of commands.', 'system');
          printLine('Start by connecting to a server: connect <url>', 'system');
       }
    };
    init();
  }, []);

  useEffect(() => {
    if (!editor) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, editor, sessionPrompt]);

  const getHeaders = () => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = token;
    }
    return headers;
  };

  const resolvePath = (targetPath: string) => {
    if (targetPath.startsWith('/')) return targetPath;
    if (pwd === '/') return '/' + targetPath;
    return pwd + '/' + targetPath;
  };

  const encodePathHeader = (pathStr: string) => {
    return encodeURIComponent(pathStr);
  };

  const doLogin = async (username: string, pass: string, remUser: boolean = false, remPass: boolean = false) => {
    printLine('Authenticating...', 'system');
    const loginRes = await proxyRequest(`${serverUrl}/api/auth/login`, 'POST', {}, {
      username,
      password: pass
    });
    if (loginRes.code === 200) {
      setToken(loginRes.data.token);
      printLine('Login successful.', 'system');
      
      if (remUser || remPass) {
         localStorage.setItem('openlist_auth', JSON.stringify({
            serverUrl,
            username: remUser || remPass ? username : '',
            password: remPass ? pass : ''
         }));
         printLine('Credentials saved to local storage.', 'system');
      } else {
         localStorage.removeItem('openlist_auth');
      }
    } else {
      printLine(`Login failed: ${loginRes.message}`, 'error');
    }
  };


  const handleCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setLines(prev => [...prev, {
      id: Math.random().toString(),
      text: trimmed,
      type: 'prompt',
      promptInfo: { pwd, server: serverUrl || 'disconnected' }
    }]);

    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    const args = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(arg => 
      arg.startsWith('"') && arg.endsWith('"') ? arg.slice(1, -1) : arg
    ) || [];

    const command = args[0].toLowerCase();

    try {
      switch (command) {
        case 'help':
          printLine('Available commands:');
          printLine('  connect <url>                   - Connect to an OpenList server');
          printLine('  login [username]                - Authenticate securely');
          printLine('  logout                          - Clear session and cached credentials');
          printLine('  ls [-R] [path]                  - List files in a directory (-R for recursive)');
          printLine('  search <keyword>                - Search for files');
          printLine('  cd <path>                       - Change current directory');
          printLine('  pwd                             - Print working directory');
          printLine('  mkdir <path>                    - Create a directory');
          printLine('  rm/rmdir <name>                 - Remove a file or directory');
          printLine('  rename <old> <new>              - Rename a file or directory');
          printLine('  copy <src> <dest_dir>           - Copy a file');
          printLine('  moveto <src> <dest_dir>         - Move a file');
          printLine('  cat <name>                      - Print the contents of a file');
          printLine('  nano/vim <name>                 - Edit a text file');
          printLine('  get <name>                      - Download a file');
          printLine('  put                             - Upload a file to current directory');
          printLine('  size/ncdu <path>                - Get size of file or directory');
          printLine('  df                              - List storage mounts');
          printLine('  link <name>                     - Get direct download link');
          printLine('  clear                           - Clear the terminal screen');
          printLine('  status                          - Show connection status');
          break;

        case 'clear':
          clearTerminal();
          break;

        case 'logout':
          setToken('');
          localStorage.removeItem('openlist_auth');
          printLine('Logged out and cleared cached credentials.', 'system');
          break;

        case 'search':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (args.length < 2) { printLine('Usage: search <keyword>', 'error'); break; }
          printLine(`Searching for "${args[1]}"...`, 'system');
          const searchRes = await proxyRequest(`${serverUrl}/api/fs/search`, 'POST', getHeaders(), {
             parent: pwd,
             keywords: args[1],
             page: 1,
             per_page: 100
          });
          if (searchRes.code === 200 && searchRes.data.content) {
             if (searchRes.data.content.length === 0) printLine('No results found.');
             else {
                searchRes.data.content.forEach((item: any) => {
                   printLine(`- <span class="text-blue-400">${item.parent}</span>/${item.name}`, 'output');
                });
             }
          } else {
             printLine(`search: ${searchRes.message}`, 'error');
          }
          break;

        case 'status':
          printLine(`Server: ${serverUrl || 'None'}`);
          printLine(`Status: ${token ? 'Logged in' : 'Not logged in'}`);
          printLine(`Directory: ${pwd}`);
          break;

        case 'connect':
          if (args.length < 2) {
            printLine('Usage: connect <url>', 'error');
            break;
          }
          let url = args[1];
          if (url.endsWith('/')) url = url.slice(0, -1);
          if (!url.startsWith('http')) url = 'http://' + url;
          setServerUrl(url);
          setToken('');
          setPwd('/');
          printLine(`Connected to ${url}`, 'system');
          break;

        case 'login':
          if (!serverUrl) {
            printLine('Not connected. Use "connect <url>" first.', 'error');
            break;
          }
          if (args.length === 3) {
            await doLogin(args[1], args[2]);
          } else if (args.length === 2) {
            setSessionPrompt({ step: 'password', username: args[1] });
          } else {
            setSessionPrompt({ step: 'username' });
          }
          break;

        case 'pwd':
          printLine(pwd);
          break;

        case 'cd':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          const targetDir = args[1] || '/';
          
          if (targetDir === '..') {
            if (pwd === '/') break;
            const parts = pwd.split('/').filter(Boolean);
            parts.pop();
            setPwd('/' + parts.join('/'));
            break;
          }
          
          const nextPath = resolvePath(targetDir);
          const cdRes = await proxyRequest(`${serverUrl}/api/fs/list`, 'POST', getHeaders(), {
            path: nextPath, password: "", page: 1, per_page: 0, refresh: false
          });

          if (cdRes.code === 200) {
            setPwd(nextPath);
          } else {
            printLine(`cd: ${targetDir}: ${cdRes.message}`, 'error');
            if (cdRes.code === 401) setToken(''); // auto logout on unauthorized
          }
          break;

        case 'ls':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          
          const isRecursive = args.includes('-R');
          const lsArgs = args.filter(a => a !== 'ls' && a !== '-R');
          const lsPath = lsArgs.length > 0 ? resolvePath(lsArgs[0]) : pwd;

          if (isRecursive) {
            printLine(`Recursive list of ${lsPath}:`, 'system');
            const doLsR = async (dir: string, prefix: string = '') => {
              const res = await proxyRequest(`${serverUrl}/api/fs/list`, 'POST', getHeaders(), {
                path: dir, password: "", page: 1, per_page: 0, refresh: false
              });
              if (res.code === 200 && res.data.content) {
                for (const item of res.data.content) {
                  const type = item.is_dir ? 'd' : '-';
                  const colorClass = item.is_dir ? 'text-blue-400 font-bold' : 'text-gray-300';
                  printLine(`${prefix}${type} <span class="${colorClass}">${item.name}</span>`, 'output');
                  if (item.is_dir) {
                    await doLsR(`${dir === '/' ? '' : dir}/${item.name}`, prefix + '  ');
                  }
                }
              }
            };
            await doLsR(lsPath);
            break;
          }

          const lsRes = await proxyRequest(`${serverUrl}/api/fs/list`, 'POST', getHeaders(), {
            path: lsPath, password: "", page: 1, per_page: 0, refresh: false
          });

          if (lsRes.code === 200) {
            const content = lsRes.data.content || [];
            if (content.length === 0) {
              printLine('Empty directory.');
            } else {
              content.forEach((item: any) => {
                const type = item.is_dir ? 'd' : '-';
                let sizeStr = '';
                if (item.is_dir) {
                  sizeStr = '-';
                } else {
                  const size = item.size;
                  if (size < 1024) sizeStr = size + ' B';
                  else if (size < 1024 * 1024) sizeStr = (size / 1024).toFixed(1) + ' KB';
                  else if (size < 1024 * 1024 * 1024) sizeStr = (size / (1024 * 1024)).toFixed(1) + ' MB';
                  else sizeStr = (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
                }
                const date = new Date(item.modified).toLocaleString();
                const colorClass = item.is_dir ? 'text-blue-400 font-bold' : 'text-gray-300';
                printLine(`${type}  ${sizeStr.padStart(10)}  ${date}  <span class="${colorClass}">${item.name}</span>`, 'output');
              });
            }
          } else {
            printLine(`ls: ${lsRes.message}`, 'error');
            if (lsRes.code === 401) setToken('');
          }
          break;

        case 'df':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          const dfRes = await proxyRequest(`${serverUrl}/api/fs/list`, 'POST', getHeaders(), {
            path: '/', password: "", page: 1, per_page: 0, refresh: false
          });
          if (dfRes.code === 200) {
            printLine('Mounted Storages:', 'system');
            (dfRes.data.content || []).forEach((item: any) => {
              if (item.is_dir) {
                printLine(`  / ${item.name} (Mount)`, 'output');
              }
            });
          } else {
            printLine(`df: ${dfRes.message}`, 'error');
          }
          break;
          
        case 'size':
        case 'ncdu':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          const sizePath = args[1] ? resolvePath(args[1]) : pwd;
          const sizeRes = await proxyRequest(`${serverUrl}/api/fs/get`, 'POST', getHeaders(), {
            path: sizePath, password: ""
          });
          if (sizeRes.code === 200) {
            const bytes = sizeRes.data.size;
            let sizeStr = bytes + ' B';
            if (bytes >= 1024 * 1024 * 1024) sizeStr = (bytes / (1024*1024*1024)).toFixed(2) + ' GB';
            else if (bytes >= 1024 * 1024) sizeStr = (bytes / (1024*1024)).toFixed(2) + ' MB';
            else if (bytes >= 1024) sizeStr = (bytes / 1024).toFixed(2) + ' KB';
            
            printLine(`Path: ${sizePath}`, 'system');
            printLine(`Type: ${sizeRes.data.is_dir ? 'Directory' : 'File'}`);
            printLine(`Size: ${sizeStr} (${bytes} bytes)`);
          } else {
            printLine(`${command}: ${sizeRes.message}`, 'error');
          }
          break;

        case 'mkdir':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (args.length < 2) { printLine('Usage: mkdir <path>', 'error'); break; }
          const mkPath = resolvePath(args[1]);
          const mkRes = await proxyRequest(`${serverUrl}/api/fs/mkdir`, 'POST', getHeaders(), { path: mkPath });
          if (mkRes.code === 200) printLine(`Directory created: ${mkPath}`, 'system');
          else printLine(`mkdir: ${mkRes.message}`, 'error');
          break;

        case 'rm':
        case 'rmdir':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (args.length < 2) { printLine(`Usage: ${command} <name>`, 'error'); break; }
          const rmRes = await proxyRequest(`${serverUrl}/api/fs/remove`, 'POST', getHeaders(), {
            dir: pwd, names: [args[1]]
          });
          if (rmRes.code === 200) printLine(`Removed: ${args[1]}`, 'system');
          else printLine(`${command}: ${rmRes.message}`, 'error');
          break;

        case 'rename':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (args.length < 3) { printLine('Usage: rename <old_name> <new_name>', 'error'); break; }
          const rnPath = resolvePath(args[1]);
          const rnRes = await proxyRequest(`${serverUrl}/api/fs/rename`, 'POST', getHeaders(), {
            name: args[2], path: rnPath
          });
          if (rnRes.code === 200) printLine(`Renamed to: ${args[2]}`, 'system');
          else printLine(`rename: ${rnRes.message}`, 'error');
          break;

        case 'copy':
        case 'moveto':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (args.length < 3) { printLine(`Usage: ${command} <src_name> <dest_dir>`, 'error'); break; }
          const op = command === 'copy' ? 'copy' : 'move';
          const srcName = args[1];
          const destDir = resolvePath(args[2]);
          const opRes = await proxyRequest(`${serverUrl}/api/fs/${op}`, 'POST', getHeaders(), {
            src_dir: pwd, dst_dir: destDir, names: [srcName]
          });
          if (opRes.code === 200) printLine(`${command === 'copy' ? 'Copied' : 'Moved'} ${srcName} to ${destDir}`, 'system');
          else printLine(`${command}: ${opRes.message}`, 'error');
          break;

        case 'link':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (args.length < 2) { printLine('Usage: link <name>', 'error'); break; }
          const linkPath = resolvePath(args[1]);
          const linkRes = await proxyRequest(`${serverUrl}/api/fs/get`, 'POST', getHeaders(), { path: linkPath, password: "" });
          if (linkRes.code === 200 && linkRes.data?.raw_url) {
            printLine(`<a href="${linkRes.data.raw_url}" target="_blank" class="text-blue-400 underline hover:text-blue-300">${linkRes.data.raw_url}</a>`, 'output');
          } else {
            printLine(`link: ${linkRes.message || 'File not found or is a directory'}`, 'error');
          }
          break;
          
        case 'get':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (args.length < 2) { printLine('Usage: get <name>', 'error'); break; }
          const getPath = resolvePath(args[1]);
          const getRes = await proxyRequest(`${serverUrl}/api/fs/get`, 'POST', getHeaders(), { path: getPath, password: "" });
          if (getRes.code === 200 && getRes.data?.raw_url) {
            printLine(`Downloading ${args[1]}...`, 'system');
            const a = document.createElement('a');
            a.href = getRes.data.raw_url;
            a.download = args[1];
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            printLine(`get: ${getRes.message || 'File not found'}`, 'error');
          }
          break;
          
        case 'put':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
          break;

        case 'cat':
        case 'nano':
        case 'vim':
          if (!serverUrl) { printLine('Not connected.', 'error'); break; }
          if (args.length < 2) { printLine(`Usage: ${command} <name>`, 'error'); break; }
          const catPath = resolvePath(args[1]);
          const catRes = await proxyRequest(`${serverUrl}/api/fs/get`, 'POST', getHeaders(), { path: catPath, password: "" });
          
          let fileContent = '';
          let fetchSuccess = false;

          if (catRes.code === 200 && catRes.data?.raw_url) {
            printLine(`Fetching ${catPath}...`, 'system');
            try {
              const fileRes = await fetch(catRes.data.raw_url);
              if (fileRes.ok) {
                fileContent = await fileRes.text();
                fetchSuccess = true;
              } else {
                printLine(`${command}: Failed to fetch file content (${fileRes.status})`, 'error');
              }
            } catch (err: any) {
              printLine(`${command}: Failed to download file (${err.message})`, 'error');
            }
          } else {
            // File doesn't exist or is a directory
            if (command === 'cat') {
              printLine(`cat: ${catRes.message || 'File not found or is a directory'}`, 'error');
            } else if (catRes.message?.includes('not found') || catRes.code !== 200) {
              printLine(`Creating new file: ${catPath}`, 'system');
              fetchSuccess = true; // allow editor to open
            } else {
               printLine(`${command}: ${catRes.message}`, 'error');
            }
          }

          if (fetchSuccess) {
            if (command === 'cat') {
              const escapedText = fileContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              printLine(escapedText);
            } else {
              setEditor({
                active: true,
                type: command as 'nano' | 'vim',
                path: catPath,
                content: fileContent
              });
            }
          }
          break;

        default:
          printLine(`Command not found: ${command}. Type "help" for a list of commands.`, 'error');
      }
    } catch (err: any) {
      printLine(`Error executing command: ${err.message}`, 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    printLine(`Uploading ${file.name} (${file.size} bytes)...`, 'system');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      const destPath = resolvePath(file.name);
      
      try {
        const uploadHeaders: Record<string, string> = {
          'Authorization': token,
          'File-Path': encodePathHeader(destPath),
          'As-Task': 'false'
        };
        const uploadRes = await proxyUpload(`${serverUrl}/api/fs/put`, uploadHeaders, base64Data);
        if (uploadRes.code === 200) {
          printLine(`Uploaded successfully: ${destPath}`, 'system');
        } else {
          printLine(`Upload failed: ${uploadRes.message}`, 'error');
        }
      } catch (err: any) {
        printLine(`Upload error: ${err.message}`, 'error');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  const handleEditorSave = async () => {
    if (!editor) return;
    printLine(`Saving ${editor.path}...`, 'system');
    try {
      const base64Data = btoa(unescape(encodeURIComponent(editor.content)));
      const uploadHeaders: Record<string, string> = {
        'Authorization': token,
        'File-Path': encodePathHeader(editor.path),
        'As-Task': 'false'
      };
      const uploadRes = await proxyUpload(`${serverUrl}/api/fs/put`, uploadHeaders, base64Data);
      if (uploadRes.code === 200) {
        printLine(`Saved successfully.`, 'system');
      } else {
        printLine(`Save failed: ${uploadRes.message}`, 'error');
      }
    } catch (err: any) {
      printLine(`Save error: ${err.message}`, 'error');
    }
    setEditor(null);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (sessionPrompt.step === 'username') {
        printLine(`Username: ${input}`, 'output');
        setSessionPrompt({ step: 'password', username: input });
        setInput('');
        return;
      }
      if (sessionPrompt.step === 'password') {
        printLine(`Password: ********`, 'output');
        setSessionPrompt({ step: 'rememberUser', username: sessionPrompt.username, password: input });
        setInput('');
        return;
      }
      if (sessionPrompt.step === 'rememberUser') {
        const remUser = input.toLowerCase().startsWith('y');
        printLine(`Remember username? [y/N]: ${input || 'n'}`, 'output');
        setSessionPrompt({ ...sessionPrompt, step: 'rememberPass', rememberUser: remUser });
        setInput('');
        return;
      }
      if (sessionPrompt.step === 'rememberPass') {
        const remPass = input.toLowerCase().startsWith('y');
        printLine(`Remember password? [y/N]: ${input || 'n'}`, 'output');
        await doLogin(sessionPrompt.username!, sessionPrompt.password!, sessionPrompt.rememberUser, remPass);
        setSessionPrompt({ step: 'none' });
        setInput('');
        return;
      }
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sessionPrompt.step !== 'none') return;
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (sessionPrompt.step !== 'none') return;
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.ctrlKey && e.key === 'c') {
      if (sessionPrompt.step !== 'none') {
        printLine('^C', 'system');
        setSessionPrompt({ step: 'none' });
        setInput('');
      }
    }
  };

  if (editor) {
    return (
      <div className="flex-1 flex flex-col bg-gray-950 text-gray-100 font-mono">
        <div className="bg-gray-800 text-center text-xs py-1 font-bold text-yellow-400">
          {editor.type === 'nano' ? 'GNU nano 7.2' : 'VIM - Vi IMproved'} - {editor.path}
        </div>
        <textarea
          className="flex-1 bg-transparent text-gray-200 outline-none p-4 resize-none leading-relaxed"
          value={editor.content}
          onChange={e => setEditor({...editor, content: e.target.value})}
          autoFocus
          spellCheck={false}
          onKeyDown={e => {
            if (e.ctrlKey && e.key === 'x') {
              e.preventDefault();
              handleEditorSave();
            } else if (e.ctrlKey && e.key === 'c') {
              e.preventDefault();
              setEditor(null);
            } else if (editor.type === 'vim' && e.key === 'Escape') {
              // Minimal vim hint
              printLine('Vim mode is simplified. Use ^X to save or ^C to exit.', 'system');
            }
          }}
        />
        <div className="bg-gray-800 text-xs py-2 px-4 flex gap-6 text-gray-400">
          <span><strong className="text-white">^X</strong> Save & Exit</span>
          <span><strong className="text-white">^C</strong> Cancel</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 overflow-y-auto p-4 flex flex-col cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />
      
      {lines.map(line => {
        if (line.type === 'prompt' && line.promptInfo) {
          const { server, pwd } = line.promptInfo;
          const displayServer = server.replace(/^https?:\/\//, '');
          return (
            <div key={line.id} className="mb-1">
              <span className="text-green-400">{displayServer}</span>
              <span className="text-gray-400">:</span>
              <span className="text-blue-400">{pwd}</span>
              <span className="text-gray-400">$ </span>
              <span className="text-gray-100">{line.text}</span>
            </div>
          );
        }

        let textColorClass = 'text-gray-300';
        if (line.type === 'error') textColorClass = 'text-red-400';
        if (line.type === 'system') textColorClass = 'text-yellow-400';

        return (
          <div 
            key={line.id} 
            className={`mb-1 whitespace-pre-wrap ${textColorClass}`}
            dangerouslySetInnerHTML={{ __html: line.text }}
          />
        );
      })}
      
      <div className="flex items-center mt-2">
        {sessionPrompt.step === 'none' ? (
          <>
            <span className="text-green-400">{serverUrl ? serverUrl.replace(/^https?:\/\//, '') : 'disconnected'}</span>
            <span className="text-gray-400">:</span>
            <span className="text-blue-400">{pwd}</span>
            <span className="text-gray-400 mr-2">$</span>
          </>
        ) : sessionPrompt.step === 'username' ? (
          <span className="text-gray-400 mr-2">Username:</span>
        ) : sessionPrompt.step === 'password' ? (
          <span className="text-gray-400 mr-2">Password:</span>
        ) : sessionPrompt.step === 'rememberUser' ? (
          <span className="text-gray-400 mr-2">Remember username? [y/N]:</span>
        ) : (
          <span className="text-gray-400 mr-2">Remember password? [y/N]:</span>
        )}
        
        <input
          ref={inputRef}
          type={sessionPrompt.step === 'password' ? 'password' : 'text'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none border-none text-gray-100 font-mono"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div ref={bottomRef} className="h-4" />
    </div>
  );
}

