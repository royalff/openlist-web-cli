/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TerminalApp } from './components/TerminalApp';

export default function App() {
  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex flex-col font-mono">
      <header className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-green-400 flex items-center gap-2">
          <span className="text-gray-500">$&gt;</span> OpenList CLI
        </h1>
        <div className="text-xs text-gray-500">
          Web-based Command Line Interface for OpenList
        </div>
      </header>
      <main className="flex-1 flex flex-col relative">
        <TerminalApp />
      </main>
    </div>
  );
}
