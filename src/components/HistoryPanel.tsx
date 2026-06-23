import React, { useState } from 'react';
import { HistoryEntry } from '../types';
import { 
  History, 
  FileAudio, 
  Play, 
  Square, 
  Plus, 
  RefreshCw, 
  CloudLightning, 
  Calendar, 
  Clock, 
  FileText, 
  Music
} from 'lucide-react';

interface HistoryPanelProps {
  historyList: HistoryEntry[];
  uploadsList: string[];
  onLoadVersion: (entry: HistoryEntry) => void;
  onAddSoundFromFile: (filename: string) => void;
  isDev: boolean;
  onRefresh: () => void;
}

export default function HistoryPanel({
  historyList,
  uploadsList,
  onLoadVersion,
  onAddSoundFromFile,
  isDev,
  onRefresh,
}: HistoryPanelProps) {
  // Local state to track which audio preview is playing
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleTogglePreview = (filename: string) => {
    if (playingPreview === filename) {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingPreview(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const baseUrl = import.meta.env.BASE_URL;
      const audioUrl = `${baseUrl}uploads/${filename}`;
      const newAudio = new Audio(audioUrl);
      newAudio.volume = 0.5;
      newAudio.onended = () => setPlayingPreview(null);
      newAudio.play().catch(e => console.warn('Preview play failed:', e));
      setAudioElement(newAudio);
      setPlayingPreview(filename);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 text-slate-200">
      {/* Sync Status Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isDev ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-300">
            {isDev ? 'DEV SYNC ACTIVE' : 'GH-PAGES READ-ONLY'}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1 px-2 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white rounded border border-slate-700/50 flex items-center gap-1.5 transition active:scale-95"
        >
          <RefreshCw size={11} className="animate-hover-spin" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto pr-1">
        {/* LEFT COLUMN: Versions / History */}
        <div className="flex flex-col bg-slate-900/40 border border-slate-800 rounded-xl p-4 min-h-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <History size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">Hourly Versions History</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {historyList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-850 rounded-lg">
                <Clock size={24} className="text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">No versions saved yet</p>
                <p className="text-[10px] text-slate-500 max-w-[180px] mt-1 leading-normal">
                  In Dev Mode, changing scripts or pads automatically creates version snapshots.
                </p>
              </div>
            ) : (
              historyList.map((entry) => (
                <div 
                  key={entry.id} 
                  className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-lg p-3 transition flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-mono text-cyan-400 font-bold flex items-center gap-1">
                        <Calendar size={11} />
                        {entry.formattedDate.split(',')[1]?.trim() || entry.formattedDate}
                      </span>
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        {entry.formattedDate.split(',')[2]?.trim() || ''}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                        <FileText size={11} className="text-slate-450" />
                        {entry.script.title || 'Untitled Play'}
                      </p>
                      <p className="text-[10px] text-slate-450 font-mono flex items-center gap-4">
                        <span>Lines: {entry.script.lines.length}</span>
                        <span>SFX Pads: {entry.sounds.length}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to load the version from ${entry.formattedDate}? Current unsaved settings will be replaced.`)) {
                        onLoadVersion(entry);
                      }
                    }}
                    className="w-full py-1 bg-slate-900 hover:bg-cyan-950/20 text-slate-300 hover:text-cyan-400 border border-slate-850 hover:border-cyan-500/20 text-xs font-bold font-mono tracking-wider rounded transition active:scale-98 uppercase"
                  >
                    Restore Version
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Library Uploads */}
        <div className="flex flex-col bg-slate-900/40 border border-slate-800 rounded-xl p-4 min-h-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <CloudLightning size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">Uploaded Files Library</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {uploadsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-850 rounded-lg">
                <FileAudio size={24} className="text-slate-600 mb-2" />
                <p className="text-xs text-slate-400 font-semibold">No uploaded files</p>
                <p className="text-[10px] text-slate-500 max-w-[180px] mt-1 leading-normal">
                  Uploaded sound files in dev mode will show up here so you can reuse them.
                </p>
              </div>
            ) : (
              uploadsList.map((filename) => (
                <div 
                  key={filename} 
                  className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate" title={filename}>
                      {filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')}
                    </p>
                    <p className="text-[9px] font-mono text-slate-500 truncate">{filename}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Preview Play/Stop */}
                    <button
                      type="button"
                      onClick={() => handleTogglePreview(filename)}
                      className={`p-1.5 rounded-lg border transition ${
                        playingPreview === filename
                          ? 'bg-rose-950 border-rose-500/20 text-rose-400'
                          : 'bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={playingPreview === filename ? 'Stop Preview' : 'Preview Sound'}
                    >
                      {playingPreview === filename ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    </button>

                    {/* Add to Deck */}
                    <button
                      type="button"
                      onClick={() => onAddSoundFromFile(filename)}
                      className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/15 text-cyan-400 hover:text-cyan-300 rounded-lg transition active:scale-95 flex items-center gap-1 text-[10px] font-mono font-bold uppercase pl-1.5 pr-2"
                      title="Add cell trigger for this sound"
                    >
                      <Plus size={12} />
                      Add Pad
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
