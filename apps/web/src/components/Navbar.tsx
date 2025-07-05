"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gakwaya_auth');
      router.push('/login');
    }
  };

  return (
    <nav className="w-full bg-gray-800 text-white p-4 flex items-center">
      <span className="font-bold text-lg">GakwayaPanel</span>
      <div className="ml-auto flex gap-4">
        <Link href="/dashboard" className="hover:text-gray-300">Home</Link>
        <button className="hover:text-gray-300" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
} 