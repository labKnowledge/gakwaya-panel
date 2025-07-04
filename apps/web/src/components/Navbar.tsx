import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="w-full bg-gray-800 text-white p-4 flex items-center">
      <span className="font-bold text-lg">GakwayaPanel</span>
      <div className="ml-auto flex gap-4">
        <Link href="/dashboard" className="hover:text-gray-300">Home</Link>
        <button className="hover:text-gray-300">Logout</button>
      </div>
    </nav>
  );
} 