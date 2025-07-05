"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createApplication, deployApplicationFromGit } from '@/services/api';
import { FaDocker, FaGithub } from 'react-icons/fa';

const DEPLOY_METHODS = [
  { key: 'docker', label: 'Docker Image', icon: <FaDocker className="inline mr-2 text-blue-500" /> },
  { key: 'git', label: 'GitHub Repository', icon: <FaGithub className="inline mr-2 text-gray-800" /> },
];

const steps = [
  { key: 'method', label: 'Select Method' },
  { key: 'details', label: 'Application Details' },
  { key: 'confirm', label: 'Confirm & Deploy' },
];

export default function DeployAppPage() {
  const [method, setMethod] = useState<'docker' | 'git'>('docker');
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [step, setStep] = useState<'method' | 'details' | 'confirm'>('method');
  const [gitUrl, setGitUrl] = useState('');
  const [dockerfilePath, setDockerfilePath] = useState('');
  const [volumes, setVolumes] = useState<string[]>([]);
  const [buildArgs, setBuildArgs] = useState<Record<string, string>>({});
  const [domain, setDomain] = useState('');
  const [port, setPort] = useState<number | ''>('');

  const handleNext = () => {
    if (step === 'method') setStep('details');
    else if (step === 'details') setStep('confirm');
  };
  const handleBack = () => {
    if (step === 'details') setStep('method');
    else if (step === 'confirm') setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (method === 'docker') {
        await createApplication({
          name,
          image,
          git_url: gitUrl,
          dockerfile_path: dockerfilePath,
          volumes,
          build_args: buildArgs,
          domain,
          port: port === '' ? undefined : Number(port),
        });
      } else {
        await deployApplicationFromGit({
          name,
          git_url: gitUrl || repoUrl,
          branch: branch || undefined,
          dockerfile_path: dockerfilePath,
          volumes,
          build_args: buildArgs,
          domain,
          port: port === '' ? undefined : Number(port),
        });
      }
      setSuccess('Application deployed successfully!');
      setTimeout(() => router.push('/apps'), 1200);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to deploy application');
    } finally {
      setLoading(false);
    }
  };

  // Progress bar logic
  const stepIndex = steps.findIndex(s => s.key === step);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12">
      <div className="flex flex-col md:flex-row gap-10 w-full">
        {/* Left: Form/Wizard */}
        <div className="flex-1 bg-white/90 rounded-3xl shadow-2xl p-8 relative z-10">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {steps.map((s, i) => (
                <div key={s.key} className="flex-1 flex flex-col items-center">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-lg border-2 transition-all duration-300 ${step === s.key ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-lg' : i < stepIndex ? 'bg-blue-100 text-blue-600 border-blue-400' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>{i + 1}</div>
                  <span className={`mt-1 text-xs font-semibold ${step === s.key ? 'text-blue-700' : 'text-gray-400'}`}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full mt-2 relative overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {/* Step 1: Method Selection */}
          {step === 'method' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-extrabold mb-4 text-gray-900">How do you want to deploy?</h1>
              <div className="flex gap-6 mb-8">
                {DEPLOY_METHODS.map((m) => (
                  <button
                    key={m.key}
                    className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-semibold border-2 transition-all duration-200 text-lg shadow-sm ${method === m.key ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                    onClick={() => setMethod(m.key as 'docker' | 'git')}
                    type="button"
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow transition"
                onClick={handleNext}
                disabled={!method}
              >
                Next
              </button>
            </div>
          )}
          {/* Step 2: Details */}
          {step === 'details' && (
            <form onSubmit={e => { e.preventDefault(); handleNext(); }} className="animate-fade-in space-y-8">
              <h2 className="text-xl font-bold mb-2 text-gray-800">Application Details</h2>
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Application Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. my-cool-app"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              {method === 'docker' && (
                <div>
                  <label className="block font-semibold mb-1 text-gray-800">Docker Image <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. nginx:latest"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={image}
                    onChange={e => setImage(e.target.value)}
                    required={method === 'docker'}
                  />
                  <p className="text-xs text-gray-400 mt-1">Provide a valid Docker image name, optionally with a tag.</p>
                </div>
              )}
              {method === 'git' && (
                <>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-800">GitHub Repository URL <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      placeholder="https://github.com/username/repo.git"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      value={repoUrl}
                      onChange={e => setRepoUrl(e.target.value)}
                      required={method === 'git'}
                    />
                    <p className="text-xs text-gray-400 mt-1">Paste the full HTTPS URL of your public or private GitHub repository.</p>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-800">Branch Name <span className="text-gray-400">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. main"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">Specify the branch to deploy (default is usually &#39;main&#39;).</p>
                  </div>
                </>
              )}
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Description</label>
                <textarea
                  placeholder="Describe your application (optional)"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition min-h-[80px]"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Git URL</label>
                <input type="text" className="w-full border border-gray-300 p-3 rounded-lg" value={gitUrl} onChange={e => setGitUrl(e.target.value)} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Dockerfile Path</label>
                <input type="text" className="w-full border border-gray-300 p-3 rounded-lg" value={dockerfilePath} onChange={e => setDockerfilePath(e.target.value)} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Volumes (comma separated)</label>
                <input type="text" className="w-full border border-gray-300 p-3 rounded-lg" value={volumes.join(',')} onChange={e => setVolumes(e.target.value.split(',').map(v => v.trim()).filter(Boolean))} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Build Args (key=value, one per line)</label>
                <textarea className="w-full border border-gray-300 p-3 rounded-lg" value={Object.entries(buildArgs).map(([k,v])=>`${k}=${v}`).join('\n')} onChange={e => {
                  const obj: Record<string,string> = {};
                  e.target.value.split('\n').forEach(line => {
                    const idx = line.indexOf('=');
                    if (idx > 0) obj[line.slice(0,idx).trim()] = line.slice(idx+1).trim();
                  });
                  setBuildArgs(obj);
                }} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Domain</label>
                <input type="text" className="w-full border border-gray-300 p-3 rounded-lg" value={domain} onChange={e => setDomain(e.target.value)} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Port</label>
                <input type="number" className="w-full border border-gray-300 p-3 rounded-lg" value={port} onChange={e => setPort(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-bold text-lg shadow transition"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow transition"
                  disabled={!name || (method === 'docker' && !image) || (method === 'git' && !repoUrl)}
                >
                  Next
                </button>
              </div>
            </form>
          )}
          {/* Step 3: Confirm & Deploy */}
          {step === 'confirm' && (
            <form onSubmit={handleSubmit} className="animate-fade-in space-y-8">
              <h2 className="text-xl font-bold mb-2 text-gray-800">Confirm & Deploy</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="mb-2"><span className="font-semibold">Name:</span> {name}</div>
                <div className="mb-2"><span className="font-semibold">Method:</span> {method === 'docker' ? 'Docker Image' : 'GitHub Repository'}</div>
                {method === 'docker' && <div className="mb-2"><span className="font-semibold">Docker Image:</span> {image}</div>}
                {method === 'git' && <div className="mb-2"><span className="font-semibold">Git URL:</span> {gitUrl || repoUrl}</div>}
                <div className="mb-2"><span className="font-semibold">Branch:</span> {branch}</div>
                <div className="mb-2"><span className="font-semibold">Dockerfile Path:</span> {dockerfilePath}</div>
                <div className="mb-2"><span className="font-semibold">Volumes:</span> {volumes.join(', ')}</div>
                <div className="mb-2"><span className="font-semibold">Build Args:</span> {Object.entries(buildArgs).map(([k,v])=>`${k}=${v}`).join(', ')}</div>
                <div className="mb-2"><span className="font-semibold">Domain:</span> {domain}</div>
                <div className="mb-2"><span className="font-semibold">Port:</span> {port}</div>
              </div>
              {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}
              {success && <div className="text-green-600 text-sm font-semibold">{success}</div>}
              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-bold text-lg shadow transition"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow transition disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Deploying...' : 'Deploy Application'}
                </button>
              </div>
            </form>
          )}
        </div>
        {/* Right: Live Summary Card */}
        <div className="hidden md:block flex-1 sticky top-16 self-start">
          <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-100 rounded-3xl shadow-xl p-8 border border-gray-100 min-h-[400px] animate-fade-in">
            <h2 className="text-2xl font-extrabold mb-4 text-gray-900 flex items-center gap-2">
              {method === 'docker' ? <FaDocker className="text-blue-500" /> : <FaGithub className="text-gray-800" />} Application Preview
            </h2>
            <div className="space-y-4">
              <div>
                <span className="block text-xs text-gray-400 font-semibold mb-1">Name</span>
                <span className="text-lg font-bold text-blue-900">{name || <span className="text-gray-400">Not set</span>}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 font-semibold mb-1">Method</span>
                <span className="text-lg font-bold text-blue-900">{method === 'docker' ? 'Docker Image' : 'GitHub Repository'}</span>
              </div>
              {method === 'docker' && (
                <div>
                  <span className="block text-xs text-gray-400 font-semibold mb-1">Docker Image</span>
                  <span className="text-lg text-blue-900">{image || <span className="text-gray-400">Not set</span>}</span>
                </div>
              )}
              {method === 'git' && (
                <div>
                  <span className="block text-xs text-gray-400 font-semibold mb-1">Repo URL</span>
                  <span className="text-lg text-blue-900">{repoUrl || <span className="text-gray-400">Not set</span>}</span>
                </div>
              )}
              <div>
                <span className="block text-xs text-gray-400 font-semibold mb-1">Description</span>
                <span className="text-blue-900">{description || <span className="text-gray-400">No description</span>}</span>
              </div>
            </div>
            <div className="mt-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2 text-gray-800">How it works</h3>
                <ul className="list-disc pl-6 text-gray-600 text-sm space-y-1">
                  <li><span className="font-semibold">Docker Image:</span> The app will be deployed using the Docker image you provide. Make sure the image is accessible from the deployment environment.</li>
                  <li><span className="font-semibold">GitHub Repository:</span> The app will be deployed by cloning the specified repository and running the deployment process. Ensure your repo is accessible and contains a valid Dockerfile or deployment instructions.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Animations */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
} 