"use client";
import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getApplicationDetails, getApplicationLogs, deleteApplication, updateApplication } from '@/services/api';
import EnvVars from '@/components/EnvVars';
import LogsViewer from '@/components/LogsViewer';
import { envStringToObj } from '@/components/EnvVars';

type Application = {
  id: string;
  name: string;
  image?: string;
  status: string;
  env?: Record<string, string>;
  // Add more fields as needed
};

export default function AppDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [details, setDetails] = useState<Application | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const router = useRouter();

  const fetchDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const [detailsData, logsData] = await Promise.all([
        getApplicationDetails(id),
        getApplicationLogs(id),
      ]);
      setDetails(detailsData.application || detailsData);
      setLogs(logsData);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteApplication(id);
      router.push('/apps');
    } catch (err: unknown) {
      if (err instanceof Error) setDeleteError(err.message);
      else setDeleteError('Failed to delete application');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!details) return;
    setEditName(details.name);
    setEditImage(details.image || '');
    setEditing(true);
    setEditError('');
    setEditSuccess('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditLoading(true);
    try {
      await updateApplication(id, { name: editName, image: editImage });
      setEditSuccess('Application updated!');
      setEditing(false);
      fetchDetails();
    } catch (err: unknown) {
      if (err instanceof Error) setEditError(err.message);
      else setEditError('Failed to update application');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEnvSave = async (env: Record<string, string>) => {
    if (!details) return;
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    try {
      await updateApplication(id, {
        name: details.name,
        image: details.image,
        env,
      });
      setEditSuccess('Environment variables updated!');
      fetchDetails();
    } catch (err: unknown) {
      if (err instanceof Error) setEditError(err.message);
      else setEditError('Failed to update environment variables');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!details) return <div className="p-8">No details found.</div>;

  console.log('details', details);
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{details.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
            disabled={editing}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 disabled:opacity-50"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
      {deleteError && <div className="text-red-500 mb-2">{deleteError}</div>}
      {editing && (
        <form onSubmit={handleEditSubmit} className="mb-4 space-y-2 max-w-md">
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            required
          />
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={editImage}
            onChange={e => setEditImage(e.target.value)}
            required
          />
          {editError && <div className="text-red-500 text-sm">{editError}</div>}
          {editSuccess && <div className="text-green-600 text-sm">{editSuccess}</div>}
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="bg-gray-300 text-gray-800 px-4 py-2 rounded font-semibold" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="mb-4">
        <span className={`px-2 py-1 rounded text-xs ${details.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{details.status}</span>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Logs</h2>
        <LogsViewer logs={logs} />
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
        <EnvVars
          env={
            typeof details.env === 'string'
              ? envStringToObj(details.env)
              : (details.env || {})
          }
          onSave={handleEnvSave}
          loading={editLoading}
        />
        {editError && <div className="text-red-500 text-sm mt-2">{editError}</div>}
        {editSuccess && <div className="text-green-600 text-sm mt-2">{editSuccess}</div>}
      </div>
    </div>
  );
} 