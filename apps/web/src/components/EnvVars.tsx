import React, { useState, useEffect } from "react";

type EnvVarsProps = {
  env?: Record<string, string>;
  onSave?: (env: Record<string, string>) => void;
  loading?: boolean;
};

export function envObjToString(env?: Record<string, string> | null): string {
  if (!env) return "";
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function envStringToObj(str: string): Record<string, string> {
  try {
    console.log("str", str);
    return JSON.parse(str);
  } catch (err) {
    console.log("err", err);
    const obj: Record<string, string> = {};
    str.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      console.log("idx", idx);
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        console.log("key", key);
        console.log("value", value);
        obj[key] = value;
      }
    });
    return obj;
  }
}

export default function EnvVars({ env = {}, onSave, loading }: EnvVarsProps) {
  const [envText, setEnvText] = useState(envObjToString(env));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    console.log("env prop changed:", env);
    setEnvText(envObjToString(env));
    setDirty(false);
  }, [env]);

  const handleSave = () => {
    if (onSave) {
      onSave(envStringToObj(envText));
      setDirty(false);
    }
  };

  const handleReset = () => {
    setEnvText(envObjToString(env));
    setDirty(false);
  };

  return (
    <div className="space-y-2">
      <label className="block font-semibold mb-1">
        Environment Variables (.env format)
      </label>
      <textarea
        className="w-full h-40 p-3 font-mono text-sm bg-gray-900 text-green-300 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
        value={envText}
        onChange={(e) => {
          setEnvText(e.target.value);
          setDirty(true);
        }}
        spellCheck={false}
        placeholder={"KEY=value\nANOTHER_KEY=another_value"}
        disabled={loading}
      />
      <div className="flex gap-2">
        <button
          className="bg-blue-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          onClick={handleSave}
          disabled={loading || !dirty}
        >
          {loading ? "Saving..." : "Save Env Vars"}
        </button>
        <button
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded font-semibold disabled:opacity-50"
          onClick={handleReset}
          disabled={loading || !dirty}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
