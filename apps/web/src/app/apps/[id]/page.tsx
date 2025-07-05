"use client";
import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getApplicationDetails, getApplicationLogs, deleteApplication, updateApplication } from '@/services/api';
import EnvVars from '@/components/EnvVars';
import LogsViewer from '@/components/LogsViewer';
import { envStringToObj } from '@/components/EnvVars';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'edit', label: 'Edit' },
  { key: 'deploy', label: 'Deploy' },
  { key: 'deploy-git', label: 'Deploy from Git' },
  { key: 'logs', label: 'Logs' },
  { key: 'env', label: 'Environment' },
];

type Application = {
  id: string;
  name: string;
  repo_url?: string;
  description?: string;
  image?: string;
  status: string;
  created_at?: string;
  env?: Record<string, string>;
};

export default function AppDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [details, setDetails] = useState<Application | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editRepoUrl, setEditRepoUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState('');
  const [deployGitMsg, setDeployGitMsg] = useState('');
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

  // --- Delete ---
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

  // --- Edit ---
  useEffect(() => {
    if (details) {
      setEditName(details.name || '');
      setEditImage(details.image || '');
      setEditRepoUrl(details.repo_url || '');
      setEditDescription(details.description || '');
    }
  }, [details]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditLoading(true);
    try {
      await updateApplication(id, {
        name: editName,
        image: editImage,
        repo_url: editRepoUrl,
        description: editDescription,
      });
      setEditSuccess('Application updated!');
      fetchDetails();
    } catch (err: unknown) {
      if (err instanceof Error) setEditError(err.message);
      else setEditError('Failed to update application');
    } finally {
      setEditLoading(false);
    }
  };

  // --- Deploy ---
  const handleDeploy = async () => {
    setDeploying(true);
    setDeployMsg('');
    try {
      const res = await fetch(`/api/applications/${id}/deploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('gakwaya_auth')}` },
      });
      const data = await res.json();
      setDeployMsg(data.message || 'Deployment started.');
    } catch {
      setDeployMsg('Failed to start deployment.');
    } finally {
      setDeploying(false);
    }
  };
  const handleDeployFromGit = async () => {
    setDeploying(true);
    setDeployGitMsg('');
    try {
      const res = await fetch(`/api/applications/${id}/deploy-from-git`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('gakwaya_auth')}` },
      });
      const data = await res.json();
      setDeployGitMsg(data.message || 'Deployment from Git started.');
    } catch {
      setDeployGitMsg('Failed to start deployment from Git.');
    } finally {
      setDeploying(false);
    }
  };

  // --- Env Vars ---
  const handleEnvSave = async (env: Record<string, string>) => {
    if (!details) return;
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    try {
      await updateApplication(id, {
        name: details.name,
        image: details.image,
        repo_url: details.repo_url,
        description: details.description,
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

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{details.name}</h1>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 disabled:opacity-50"
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
      {deleteError && <div className="text-red-500 mb-2">{deleteError}</div>}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`px-4 py-2 -mb-px border-b-2 font-semibold transition-all ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <span className={`px-2 py-1 rounded text-xs w-fit ${details.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{details.status}</span>
              <div><span className="font-semibold">Name:</span> {details.name}</div>
              {details.repo_url && <div><span className="font-semibold">Repo URL:</span> {details.repo_url}</div>}
              {details.description && <div><span className="font-semibold">Description:</span> {details.description}</div>}
              {details.image && <div><span className="font-semibold">Docker Image:</span> {details.image}</div>}
              {details.created_at && <div><span className="font-semibold">Created At:</span> {new Date(details.created_at).toLocaleString()}</div>}
            </div>
          </div>
        )}
        {tab === 'edit' && (
          <form onSubmit={handleEditSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block font-semibold mb-1">Name</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Repo URL</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={editRepoUrl}
                onChange={e => setEditRepoUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Description</label>
              <textarea
                className="w-full border p-2 rounded"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Docker Image</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={editImage}
                onChange={e => setEditImage(e.target.value)}
                required
              />
            </div>
            {editError && <div className="text-red-500 text-sm">{editError}</div>}
            {editSuccess && <div className="text-green-600 text-sm">{editSuccess}</div>}
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}
        {tab === 'deploy' && (
          <div className="space-y-4">
            <button
              onClick={handleDeploy}
              className="bg-blue-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
              disabled={deploying}
            >
              {deploying ? 'Deploying...' : 'Deploy Application'}
            </button>
            {deployMsg && <div className="text-green-600">{deployMsg}</div>}
          </div>
        )}
        {tab === 'deploy-git' && (
          <div className="space-y-4">
            <button
              onClick={handleDeployFromGit}
              className="bg-blue-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
              disabled={deploying}
            >
              {deploying ? 'Deploying...' : 'Deploy from Git'}
            </button>
            {deployGitMsg && <div className="text-green-600">{deployGitMsg}</div>}
          </div>
        )}
        {tab === 'logs' && (
          <div>
            <LogsViewer logs={logs} />
          </div>
        )}
        {tab === 'env' && (
          <div>
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
        )}
      </div>
    </div>
  );
} 