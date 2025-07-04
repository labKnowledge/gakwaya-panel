"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createApplication } from '@/services/api';

export default function DeployAppPage() {
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await createApplication({ name, image });
      setSuccess('Application deployed successfully!');
      setTimeout(() => router.push('/apps'), 1200);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to deploy application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Deploy Application</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Application Name"
          className="w-full border p-2 rounded"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Docker Image (e.g. nginx:latest)"
          className="w-full border p-2 rounded"
          value={image}
          onChange={e => setImage(e.target.value)}
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-semibold" disabled={loading}>
          {loading ? 'Deploying...' : 'Deploy'}
        </button>
      </form>
    </div>
  );
} 