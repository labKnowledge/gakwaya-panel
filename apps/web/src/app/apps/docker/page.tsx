"use client";
import React, { useEffect, useState } from "react";
import {
  getDockerContainers,
  stopDockerContainer,
  removeDockerContainer,
  restartDockerContainer,
  getDockerLogs,
  inspectDockerContainer,
  dockerPrune,
  dockerPruneAll,
} from '@/services/api';
import { InformationCircleIcon, TrashIcon, StopIcon, ArrowPathIcon, DocumentMagnifyingGlassIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

type DockerContainer = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Command: string;
  Created: number;
};

function hasContainersProp(data: unknown): data is { containers: DockerContainer[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'containers' in data &&
    Array.isArray((data as { containers: unknown }).containers)
  );
}

export default function DockerManagementPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [logs, setLogs] = useState<{ [id: string]: string }>({});
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [inspect, setInspect] = useState<Record<string, unknown>>({});
  const [showInspect, setShowInspect] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<DockerContainer | null>(null);
  const [showTerminal, setShowTerminal] = useState<string | null>(null);
  const [pruneLoading, setPruneLoading] = useState<'prune' | 'pruneAll' | null>(null);
  const [pruneResult, setPruneResult] = useState<string | null>(null);
  const [pruneError, setPruneError] = useState<string | null>(null);

  const fetchContainers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDockerContainers();
      // Map backend fields to expected frontend fields
      const mapContainer = (c: unknown): DockerContainer => {
        const obj = c as { id: string; image: string; names: string[]; status: string; command?: string; created?: number };
        return {
          Id: obj.id,
          Image: obj.image,
          Names: obj.names,
          State: obj.status && typeof obj.status === 'string'
            ? (obj.status.toLowerCase().includes('up') ? 'running'
              : obj.status.toLowerCase().includes('exited') ? 'exited'
              : obj.status.toLowerCase().includes('restarting') ? 'restarting'
              : 'unknown')
            : 'unknown',
          Status: obj.status,
          Command: obj.command || '',
          Created: obj.created || 0,
        };
      };
      if (Array.isArray(data)) {
        setContainers(data.map(mapContainer));
      } else if (hasContainersProp(data)) {
        setContainers(data.containers.map(mapContainer));
      } else {
        setContainers([]);
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to fetch containers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const handleAction = async (id: string, action: "stop" | "remove" | "restart") => {
    setActionLoading(id + action);
    setActionError("");
    try {
      if (action === "stop") await stopDockerContainer(id);
      else if (action === "remove") await removeDockerContainer(id);
      else if (action === "restart") await restartDockerContainer(id);
      await fetchContainers();
    } catch (err) {
      if (err instanceof Error) setActionError(err.message);
      else setActionError(`Failed to ${action} container`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogs = async (id: string) => {
    setShowLogs(id);
    setLogs((prev) => ({ ...prev, [id]: "Loading..." }));
    try {
      const logText = await getDockerLogs(id);
      setLogs((prev) => ({ ...prev, [id]: logText }));
    } catch (err) {
      if (err instanceof Error) setLogs((prev) => ({ ...prev, [id]: err.message }));
      else setLogs((prev) => ({ ...prev, [id]: "Failed to fetch logs" }));
    }
  };

  const handleInspect = async (id: string) => {
    setShowInspect(id);
    setInspect((prev) => ({ ...prev, [id]: "Loading..." }));
    try {
      const data = await inspectDockerContainer(id);
      setInspect((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      if (err instanceof Error) setInspect((prev) => ({ ...prev, [id]: err.message }));
      else setInspect((prev) => ({ ...prev, [id]: "Failed to inspect" }));
    }
  };

  if (loading) return <p className="text-gray-500">Loading containers...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!containers || containers.length === 0) return (
    <div className="flex flex-col items-center gap-4 py-16">
      <img src="https://undraw.co/api/illustrations/empty?color=4f46e5" alt="No containers" className="w-48 h-48 opacity-80" />
      <p className="text-gray-500 text-lg">No Docker containers found.</p>
      <p className="text-gray-400">Start a container to see it here.</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" alt="Docker" className="w-8 h-8" />
          Docker Containers
        </h2>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <button
          className="bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 px-5 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition disabled:opacity-50"
          disabled={pruneLoading === 'prune'}
          onClick={async () => {
            const result = await Swal.fire({
              title: 'Prune Unused Data',
              text: 'This will remove unused Docker data (dangling images, stopped containers, etc.). Are you sure?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Yes, prune',
              cancelButtonText: 'Cancel',
            });
            if (!result.isConfirmed) return;
            setPruneLoading('prune'); setPruneResult(null); setPruneError(null);
            try {
              const res = await dockerPrune();
              setPruneResult(res.details || 'Prune completed.');
              await fetchContainers();
              await Swal.fire('Pruned!', 'Unused Docker data has been removed.', 'success');
            } catch (err) {
              setPruneError(err instanceof Error ? err.message : 'Prune failed');
              await Swal.fire('Error', err instanceof Error ? err.message : 'Prune failed', 'error');
            } finally {
              setPruneLoading(null);
            }
          }}
          title="Remove unused Docker data (safe)"
        >
          {pruneLoading === 'prune' ? 'Pruning...' : 'Prune Unused Data'}
        </button>
        <button
          className="bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 px-5 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition disabled:opacity-50"
          disabled={pruneLoading === 'pruneAll'}
          onClick={async () => {
            const result = await Swal.fire({
              title: 'Prune All (Dangerous)',
              html: '<b>WARNING:</b> This will aggressively remove <b>ALL</b> unused Docker data, including volumes and networks. This is destructive and cannot be undone. Are you absolutely sure?',
              icon: 'error',
              showCancelButton: true,
              confirmButtonText: 'Yes, prune all',
              cancelButtonText: 'Cancel',
              focusCancel: true,
            });
            if (!result.isConfirmed) return;
            setPruneLoading('pruneAll'); setPruneResult(null); setPruneError(null);
            try {
              const res = await dockerPruneAll();
              setPruneResult(res.details || 'Prune All completed.');
              await fetchContainers();
              await Swal.fire('Pruned All!', 'All unused Docker data has been removed.', 'success');
            } catch (err) {
              setPruneError(err instanceof Error ? err.message : 'Prune All failed');
              await Swal.fire('Error', err instanceof Error ? err.message : 'Prune All failed', 'error');
            } finally {
              setPruneLoading(null);
            }
          }}
          title="Aggressively remove all unused Docker data (dangerous)"
        >
          {pruneLoading === 'pruneAll' ? 'Pruning All...' : 'Prune All (Dangerous)'}
        </button>
      </div>
      {pruneResult && <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg px-4 py-2 mb-4">{pruneResult}</div>}
      {pruneError && <div className="bg-red-50 text-red-800 border border-red-200 rounded-lg px-4 py-2 mb-4">{pruneError}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers.map((c) => (
          <div
            key={c.Id}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col gap-4 transition-transform hover:scale-[1.02] hover:shadow-2xl duration-200 cursor-pointer group"
            onClick={() => { setShowDetails(c.Id); setDetailsData(c); }}
            tabIndex={0}
            role="button"
            aria-label={`Show details for ${c.Names?.[0] || c.Id}`}
          >
            <div className="flex items-center gap-3">
              <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" alt="Docker" className="w-7 h-7" />
              <div className="font-semibold text-lg text-gray-800 truncate group-hover:underline" title={c.Names?.join(', ')}>
                {c.Names?.[0]?.replace(/\//, '') || 'Unnamed'}
              </div>
              <span className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                ${c.State === 'running' ? 'bg-green-100 text-green-700' :
                  c.State === 'exited' ? 'bg-red-100 text-red-700' :
                  c.State === 'restarting' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-200 text-gray-700'}`}
                title={c.State.charAt(0).toUpperCase() + c.State.slice(1)}>
                {c.State === 'running' && <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>}
                {c.State === 'exited' && <svg className="w-3 h-3 mr-1 text-red-500" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>}
                {c.State === 'restarting' && <svg className="w-3 h-3 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>}
                {c.State.charAt(0).toUpperCase() + c.State.slice(1)}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <InformationCircleIcon className="w-4 h-4 text-blue-400" />
                <span className="truncate" title={c.Image}><span className="font-medium text-gray-700">Image:</span> <span className="font-mono">{c.Image}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <DocumentMagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                <span className="truncate" title={c.Status}><span className="font-medium text-gray-700">Status:</span> {c.Status}</span>
              </div>
              {c.Command && (
                <div className="flex items-center gap-2">
                  <CommandLineIcon className="w-4 h-4 text-gray-400" />
                  <span className="truncate" title={c.Command}><span className="font-medium text-gray-700">Command:</span> <span className="font-mono">{c.Command}</span></span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button
                className="group bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition disabled:opacity-50"
                disabled={actionLoading === c.Id + "stop" || c.State !== "running"}
                onClick={e => { e.stopPropagation(); handleAction(c.Id, "stop"); }}
                title="Stop Container"
              >
                <StopIcon className="w-4 h-4 group-hover:scale-110 transition" />
                {actionLoading === c.Id + "stop" ? "Stopping..." : "Stop"}
              </button>
              <button
                className="group bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition disabled:opacity-50"
                disabled={actionLoading === c.Id + "remove" || c.State === "running"}
                onClick={e => {
                  e.stopPropagation();
                  if (c.State !== "exited") return;
                  if (window.confirm("Are you sure you want to delete this container? This action cannot be undone.")) {
                    handleAction(c.Id, "remove");
                  }
                }}
                title={c.State === "running" ? "Stop the container before deleting." : "Delete Container"}
              >
                <TrashIcon className="w-4 h-4 group-hover:scale-110 transition" />
                {actionLoading === c.Id + "remove" ? "Deleting..." : "Delete"}
              </button>
              <button
                className="group bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition disabled:opacity-50"
                disabled={actionLoading === c.Id + "restart"}
                onClick={e => { e.stopPropagation(); handleAction(c.Id, "restart"); }}
                title="Restart Container"
              >
                <ArrowPathIcon className="w-4 h-4 group-hover:scale-110 transition" />
                {actionLoading === c.Id + "restart" ? "Restarting..." : "Restart"}
              </button>
              <button
                className="group bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition"
                onClick={e => { e.stopPropagation(); handleLogs(c.Id); }}
                title="View Logs"
              >
                <DocumentMagnifyingGlassIcon className="w-4 h-4 group-hover:scale-110 transition" />
                Logs
              </button>
              <button
                className="group bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition"
                onClick={e => { e.stopPropagation(); handleInspect(c.Id); }}
                title="Inspect Container"
              >
                <InformationCircleIcon className="w-4 h-4 group-hover:scale-110 transition" />
                Inspect
              </button>
            </div>
          </div>
        ))}
      </div>
      {actionError && <div className="text-red-500 mt-4">{actionError.includes('stopped') ? 'You must stop the container before deleting.' : actionError}</div>}
      {/* Details Modal */}
      {showDetails && detailsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-all">
          <div className="relative bg-gradient-to-br from-blue-50 to-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 flex flex-col border-2 border-blue-200 animate-fadeIn">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-blue-700 transition"
              onClick={() => setShowDetails(null)}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" alt="Docker" className="w-10 h-10" />
              <div className="font-bold text-2xl text-gray-800 truncate" title={detailsData.Names?.join(', ')}>
                {detailsData.Names?.[0]?.replace(/\//, '') || 'Unnamed'}
              </div>
              <span className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold
                ${detailsData.State === 'running' ? 'bg-green-100 text-green-700' :
                  detailsData.State === 'exited' ? 'bg-red-100 text-red-700' :
                  detailsData.State === 'restarting' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-200 text-gray-700'}`}
                title={detailsData.State.charAt(0).toUpperCase() + detailsData.State.slice(1)}>
                {detailsData.State === 'running' && <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>}
                {detailsData.State === 'exited' && <svg className="w-3 h-3 mr-1 text-red-500" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>}
                {detailsData.State === 'restarting' && <svg className="w-3 h-3 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>}
                {detailsData.State.charAt(0).toUpperCase() + detailsData.State.slice(1)}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 text-gray-700 text-base mb-6">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Full Name:</span>
                <span className="font-mono text-xs break-all">{detailsData.Names?.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-400" />
                <span><span className="font-semibold">Image:</span> <span className="font-mono">{detailsData.Image}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <DocumentMagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                <span><span className="font-semibold">Status:</span> {detailsData.Status}</span>
              </div>
              {detailsData.Command && (
                <div className="flex items-center gap-2">
                  <CommandLineIcon className="w-5 h-5 text-gray-400" />
                  <span><span className="font-semibold">Command:</span> <span className="font-mono">{detailsData.Command}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-semibold">ID:</span>
                <span className="font-mono text-xs break-all">{detailsData.Id}</span>
              </div>
              {detailsData.Names && detailsData.Names.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Other Names:</span>
                  <span className="font-mono text-xs break-all">{detailsData.Names.slice(1).join(', ')}</span>
                </div>
              )}
              {detailsData.Created !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Created:</span>
                  <span className="font-mono text-xs">{detailsData.Created}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-center border-t pt-6 mt-4">
              <button
                className="group bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition disabled:opacity-50"
                disabled={actionLoading === detailsData.Id + "stop" || detailsData.State !== "running"}
                onClick={() => handleAction(detailsData.Id, "stop")}
                title="Stop Container"
              >
                <StopIcon className="w-5 h-5 group-hover:scale-110 transition" />
                {actionLoading === detailsData.Id + "stop" ? "Stopping..." : "Stop"}
              </button>
              <button
                className="group bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition disabled:opacity-50"
                disabled={actionLoading === detailsData.Id + "remove"}
                onClick={() => handleAction(detailsData.Id, "remove")}
                title="Delete Container"
              >
                <TrashIcon className="w-5 h-5 group-hover:scale-110 transition" />
                {actionLoading === detailsData.Id + "remove" ? "Deleting..." : "Delete"}
              </button>
              <button
                className="group bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition disabled:opacity-50"
                disabled={actionLoading === detailsData.Id + "restart"}
                onClick={() => handleAction(detailsData.Id, "restart")}
                title="Restart Container"
              >
                <ArrowPathIcon className="w-5 h-5 group-hover:scale-110 transition" />
                {actionLoading === detailsData.Id + "restart" ? "Restarting..." : "Restart"}
              </button>
              <button
                className="group bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition"
                onClick={() => handleLogs(detailsData.Id)}
                title="View Logs"
              >
                <DocumentMagnifyingGlassIcon className="w-5 h-5 group-hover:scale-110 transition" />
                Logs
              </button>
              <button
                className="group bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition"
                onClick={() => handleInspect(detailsData.Id)}
                title="Inspect Container"
              >
                <InformationCircleIcon className="w-5 h-5 group-hover:scale-110 transition" />
                Inspect
              </button>
              {/* Terminal endpoint button (if available) */}
              <button
                className="group bg-black hover:bg-gray-900 text-white border border-gray-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition"
                onClick={() => setShowTerminal(detailsData.Id)}
                title="Open Terminal"
              >
                <CommandLineIcon className="w-5 h-5 group-hover:scale-110 transition" />
                Terminal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-all">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 flex flex-col">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
              onClick={() => setShowLogs(null)}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
              <DocumentMagnifyingGlassIcon className="w-5 h-5 text-blue-500" /> Logs
            </h2>
            <pre className="bg-gray-900 text-green-200 rounded-lg p-4 max-h-[60vh] overflow-auto text-xs font-mono shadow-inner border border-gray-200">
              {logs[showLogs]}
            </pre>
          </div>
        </div>
      )}
      {/* Inspect Modal */}
      {showInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-all">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 flex flex-col">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
              onClick={() => setShowInspect(null)}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 text-green-500" /> Inspect
            </h2>
            <pre className="bg-gray-900 text-blue-200 rounded-lg p-4 max-h-[60vh] overflow-auto text-xs font-mono shadow-inner border border-gray-200">
              {typeof inspect[showInspect] === 'string'
                ? inspect[showInspect]
                : JSON.stringify(inspect[showInspect], null, 2)}
            </pre>
          </div>
        </div>
      )}
      {showTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-all">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 p-6 flex flex-col">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
              onClick={() => setShowTerminal(null)}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
              <CommandLineIcon className="w-5 h-5 text-black" /> Terminal
            </h2>
            {/* TODO: Integrate xterm.js and WebSocket connection to `/api/docker/terminal/${showTerminal}` with JWT token */}
            <div className="bg-gray-900 text-green-200 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
              <span className="text-gray-400">Terminal UI coming soon...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 