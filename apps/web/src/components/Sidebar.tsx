import React from 'react';
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="h-screen w-64 bg-gray-900 text-white flex flex-col p-4">
      <div className="font-bold text-xl mb-8">GakwayaPanel</div>
      <nav className="flex flex-col gap-4">
        <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
        <Link href="/apps" className="hover:text-gray-300">Applications</Link>
        <Link href="/apps/deploy" className="hover:text-gray-300">Deploy Application</Link>
      </nav>
    </aside>
  );
} 