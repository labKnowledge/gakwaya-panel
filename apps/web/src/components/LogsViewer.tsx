import React from 'react';

export default function LogsViewer({ logs = '' }: { logs?: string }) {
  return (
    <div className="bg-black text-green-400 p-4 rounded h-64 overflow-auto font-mono text-xs">
      {logs ? (
        <pre className="whitespace-pre-wrap">{logs}</pre>
      ) : (
        <p className="text-gray-500">[Logs placeholder]</p>
      )}
    </div>
  );
} 