"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const isAppsActive = pathname === "/apps" || pathname.startsWith("/apps/");
  const isDeployActive = pathname === "/apps/deploy";
  const isDockerActive = pathname === "/apps/docker";

  return (
    <aside className="h-screen w-64 bg-gray-900 text-white flex flex-col p-4">
      <div className="font-bold text-xl mb-8">GakwayaPanel</div>
      <nav className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className={
            (pathname === "/dashboard"
              ? "bg-white text-gray-900 font-bold shadow border-l-4 border-indigo-500 "
              : "hover:text-gray-300 ") +
            "rounded-lg px-3 py-2 transition-all duration-150"
          }
          aria-current={pathname === "/dashboard" ? "page" : undefined}
        >
          Dashboard
        </Link>
        {/* Applications parent */}
        <div className="flex flex-col">
          <Link
            href="/apps"
            className={
              (isAppsActive
                ? "bg-white text-gray-900 font-bold shadow border-l-4 border-indigo-500 "
                : "hover:text-gray-300 ") +
              "rounded-lg px-3 py-2 transition-all duration-150"
            }
            aria-current={isAppsActive ? "page" : undefined}
          >
            Applications
          </Link>
          {/* Submenu, only show if on /apps or its children */}
          {isAppsActive && (
            <div className="ml-4 mt-1 flex flex-col gap-1  rounded-lg">
              <Link
                href="/apps/deploy"
                className={
                  (isDeployActive
                    ? "bg-indigo-100 text-indigo-900 font-semibold border-l-4 border-indigo-500 "
                    : "hover:bg-indigo-50 text-white-700 ") +
                  "rounded px-3 py-2 transition-all duration-150"
                }
                aria-current={isDeployActive ? "page" : undefined}
              >
                Deploy
              </Link>
              <Link
                href="/apps/docker"
                className={
                  (isDockerActive
                    ? "bg-indigo-100 text-indigo-900 font-semibold border-l-4 border-indigo-500 "
                    : "hover:bg-indigo-50 text-white  -700 ") +
                  "rounded px-3 py-2 transition-all duration-150"
                }
                aria-current={isDockerActive ? "page" : undefined}
              >
                Docker
              </Link>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
} 