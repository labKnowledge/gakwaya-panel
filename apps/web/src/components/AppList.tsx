"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApplications, deleteApplication } from '@/services/api';

type App = {
  id: string;
  name: string;
  status: string;
};

export default function AppList() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getApplications();
      setApps(data.applications || data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to fetch applications');
      } else {
        setError('Failed to fetch applications');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    setDeletingId(id);
    try {
      await deleteApplication(id);
      fetchApps();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Failed to delete application: ${err.message}`);
      } else {
        alert('Failed to delete application');
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <p className="text-gray-500">Loading applications...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!apps || apps.length === 0) return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-gray-500">No applications found.</p>
      <Link href="/apps/deploy" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Create Application</Link>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Applications</h2>
        <Link href="/apps/deploy" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Create Application</Link>
      </div>
      <ul className="divide-y divide-gray-200">
        {apps.map(app => (
          <li key={app.id} className="py-3 flex items-center justify-between gap-2">
            <Link href={`/apps/${app.id}`} className="flex-1 flex items-center gap-2 hover:underline">
              <span className="font-medium">{app.name}</span>
            </Link>
            <span className={`px-2 py-1 rounded text-xs ${app.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{app.status}</span>
            <Link href={`/apps/${app.id}`} className="bg-yellow-500 text-white px-3 py-1 rounded font-semibold hover:bg-yellow-600">Edit</Link>
            <button
              className="bg-red-600 text-white px-3 py-1 rounded font-semibold hover:bg-red-700 disabled:opacity-50"
              onClick={() => handleDelete(app.id)}
              disabled={deletingId === app.id}
            >
              {deletingId === app.id ? 'Deleting...' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 