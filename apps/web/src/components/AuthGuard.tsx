"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('gakwaya_auth');
      if (!token) {
        router.replace('/login');
      }
    }
  }, [router]);

  return <>{children}</>;
} 