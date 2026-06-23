import React, { useState, useEffect } from 'react';
import { X, Key, Shield, HelpCircle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { testGitHubToken } from '../utils/githubSync';

interface GitHubSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedToken: string;
  onSave: (token: string) => void;
}

export default function GitHubSettingsModal({
  isOpen,
  onClose,
  savedToken,
  onSave,
}: GitHubSettingsModalProps) {
  const [token, setToken] = useState(savedToken);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setToken(savedToken);
      setTestResult(null);
    }
  }, [isOpen, savedToken]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!token.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    const success = await testGitHubToken(token.trim());
    setTestResult(success ? 'success' : 'failed');
    setIsTesting(false);
  };

  const handleSave = () => {
    onSave(token.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Key size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">GitHub Settings</h3>
              <p className="text-[10px] text-slate-500 font-mono">Sync settings directly to your repo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase">
              Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>

          {/* Guide Alert */}
          <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl flex gap-2.5 items-start text-xs text-slate-400 leading-normal">
            <Shield size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white block">Security & Token Permissions:</span>
              <p>Your token is stored locally in your browser's memory and sent only to `api.github.com`. It is never uploaded to any other server.</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                <HelpCircle size={10} />
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-cyan-300 transition"
                >
                  Click here to create a token with "repo" permissions
                </a>
              </p>
            </div>
          </div>

          {/* Action Results */}
          {testResult === 'success' && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg font-mono">
              <CheckCircle size={14} className="shrink-0" />
              <span>Connection active! Push permissions verified.</span>
            </div>
          )}
          {testResult === 'failed' && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-lg font-mono">
              <AlertCircle size={14} className="shrink-0" />
              <span>Failed. Check token correctness or scope.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between gap-3 items-center">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !token.trim()}
            className="px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-850 text-slate-300 disabled:opacity-40 transition active:scale-95 flex items-center gap-1.5"
          >
            {isTesting && <RefreshCw size={12} className="animate-spin text-cyan-400" />}
            Test Access
          </button>
          
          <div className="flex gap-2 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold uppercase bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
            >
              Apply Token
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
