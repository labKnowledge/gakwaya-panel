import React from 'react';
import AppList from '@/components/AppList';

export default function AppsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Applications</h1>
      <AppList />
    </div>
  );
} 