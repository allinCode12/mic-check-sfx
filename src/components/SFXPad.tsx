import React, { useState, useEffect } from 'react';
import { SFXSound } from '../types';
import { Play, Square, Hash, Trash2, Repeat, Volume2, AlertCircle, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface SFXPadProps {
  sound: SFXSound;
  isPlaying: boolean;
  isNextCue: boolean;
  isPracticeMode: boolean;
  onPlay: (sound: SFXSound) => void;
  onStop: (soundId: string) => void;
  onToggleNextCue: (soundId: string) => void;
  onUpdate: (soundId: string, updated: Partial<SFXSound>) => void;
  onDelete: (soundId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const colorMap = {
  cyan: {
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    borderActive: 'border-cyan-400',
    bg: 'bg-cyan-950/20',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    glowActive: 'shadow-[0_0_25px_rgba(6,182,212,0.5)]',
    indicator: 'bg-cyan-500',
    buttonHover: 'hover:bg-cyan-500/10',
    iconColor: '#22d3ee',
  },
  magenta: {
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/40',
    borderActive: 'border-fuchsia-400',
    bg: 'bg-fuchsia-950/20',
    glow: 'shadow-[0_0_15px_rgba(240,79,219,0.15)]',
    glowActive: 'shadow-[0_0_25px_rgba(240,79,219,0.5)]',
    indicator: 'bg-fuchsia-500',
    buttonHover: 'hover:bg-fuchsia-500/10',
    iconColor: '#f04fdb',
  },
  rose: {
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    borderActive: 'border-rose-400',
    bg: 'bg-rose-950/20',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
    glowActive: 'shadow-[0_0_25px_rgba(244,63,94,0.5)]',
    indicator: 'bg-rose-500',
    buttonHover: 'hover:bg-rose-500/10',
    iconColor: '#f43f5e',
  },
  green: {
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    borderActive: 'border-emerald-400',
    bg: 'bg-emerald-950/20',
    glow: 'shadow-[0_0_15px_rgba(52,211,153,0.15)]',
    glowActive: 'shadow-[0_0_25px_rgba(52,211,153,0.5)]',
    indicator: 'bg-emerald-500',
    buttonHover: 'hover:bg-emerald-500/10',
    iconColor: '#34d399',
  },
  yellow: {
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    borderActive: 'border-yellow-400',
    bg: 'bg-yellow-950/20',
    glow: 'shadow-[0_0_15px_rgba(250,204,21,0.15)]',
    glowActive: 'shadow-[0_0_25px_rgba(250,204,21,0.5)]',
    indicator: 'bg-yellow-400',
    buttonHover: 'hover:bg-yellow-400/10',
    iconColor: '#facc15',
  },
  amber: {
    text: 'text-amber-500',
    border: 'border-amber-500/40',
    borderActive: 'border-amber-400',
    bg: 'bg-amber-950/20',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    glowActive: 'shadow-[0_0_25px_rgba(245,158,11,0.5)]',
    indicator: 'bg-amber-500',
    buttonHover: 'hover:bg-amber-500/10',
    iconColor: '#f59e0b',
  },
  blue: {
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    borderActive: 'border-blue-400',
    bg: 'bg-blue-950/20',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
    glowActive: 'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
    indicator: 'bg-blue-500',
    buttonHover: 'hover:bg-blue-500/10',
    iconColor: '#3b82f6',
  },
  purple: {
    text: 'text-violet-400',
    border: 'border-violet-500/40',
    borderActive: 'border-violet-400',
    bg: 'bg-violet-950/20',
    glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]',
    glowActive: 'shadow-[0_0_25px_rgba(139,92,246,0.5)]',
    indicator: 'bg-violet-500',
    buttonHover: 'hover:bg-violet-500/10',
    iconColor: '#8b5cf6',
  },
};

const shortCutKeys = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r', 't'];

export default function SFXPad({
  sound,
  isPlaying,
  isNextCue,
  isPracticeMode,
  onPlay,
  onStop,
  onToggleNextCue,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SFXPadProps) {
  const styles = colorMap[sound.color] || colorMap.cyan;

  // Track dragging styling
  const [isHovered, setIsHovered] = useState(false);
  const [canDrag, setCanDrag] = useState(false);

  return (
    <div
      draggable={isPracticeMode && canDrag}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', sound.id);
      }}
      className={`relative rounded-xl border p-4 transition-all duration-300 flex flex-col justify-between ${styles.bg} ${
        isPlaying ? `${styles.borderActive} ${styles.glowActive} scale-[1.02]` : `${styles.border} ${styles.glow} scale-100`
      } ${
        isNextCue && !isPlaying
          ? 'border-yellow-500 ring-2 ring-yellow-500/30 animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.25)]'
          : ''
      } hover:border-slate-600`}
      style={{ minHeight: isPracticeMode ? '250px' : '155px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Indicator Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl overflow-hidden flex">
        <div
          className={`h-full ${isPlaying ? `${styles.indicator} animate-pulse w-full` : 'bg-slate-800 w-0'} transition-all duration-500`}
        />
      </div>

      {isPracticeMode ? (
        /* ================= PRACTICE MODE (EDIT STATE) ================= */
        <div className="flex flex-col gap-3 h-full">
          {/* Header row: Drag handler, name, and delete */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 flex-1">
              <span
                className="cursor-grab text-slate-500 hover:text-slate-300 p-0.5 shrink-0 drag-handle"
                onMouseEnter={() => setCanDrag(true)}
                onMouseLeave={() => setCanDrag(false)}
              >
                <GripVertical size={14} />
              </span>
              <input
                type="text"
                value={sound.name}
                id={`sound-name-input-${sound.id}`}
                onChange={(e) => onUpdate(sound.id, { name: e.target.value })}
                className="bg-slate-950 font-semibold text-xs border border-slate-800 px-2 py-1 rounded w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 text-white"
                placeholder="Sound Name"
              />
            </div>
            
            <button
              type="button"
              id={`delete-sound-btn-${sound.id}`}
              onClick={() => onDelete(sound.id)}
              className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 p-1 rounded transition-all shrink-0"
              title="Delete Pad"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Color & Key Selection */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block mb-1">COLOR</span>
              <select
                value={sound.color}
                onChange={(e) => onUpdate(sound.id, { color: e.target.value as any })}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 w-full text-xs focus:ring-1 focus:ring-cyan-500"
              >
                {Object.keys(colorMap).map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">KEY SHORTCUT</span>
              <select
                value={sound.keyShortcut}
                onChange={(e) => onUpdate(sound.id, { keyShortcut: e.target.value })}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 w-full text-xs focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="">None</option>
                {shortCutKeys.slice(1).map((k) => (
                  <option key={k} value={k}>
                    Key {k.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Volume Control */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono mb-1 text-slate-400">
              <span className="flex items-center gap-1"><Volume2 size={11} /> VOLUME</span>
              <span>{Math.round(sound.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sound.volume}
              onChange={(e) => onUpdate(sound.id, { volume: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Looping Toggle & Reordering Arrows */}
          <div className="flex justify-between items-center bg-slate-950/60 border border-slate-850 px-2 py-1 rounded-lg">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sound.isLooping}
                onChange={(e) => {
                  onUpdate(sound.id, { isLooping: e.target.checked });
                  if (!e.target.checked && isPlaying) {
                    onStop(sound.id);
                  }
                }}
                className="rounded border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 bg-slate-900"
              />
              <Repeat size={12} className={sound.isLooping ? styles.text : 'text-slate-600'} />
              <span className="text-[10px] font-mono">LOOP</span>
            </label>

            {/* Reordering helper arrows for mobile or accessibility */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={onMoveUp}
                className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition"
                title="Move Left/Up"
              >
                <ChevronUp size={11} />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition"
                title="Move Right/Down"
              >
                <ChevronDown size={11} />
              </button>
            </div>
          </div>

          {/* Play/Stop Trigger Panel */}
          <div className="flex items-center gap-2 mt-auto pt-1">
            <button
              type="button"
              id={`test-play-btn-${sound.id}`}
              onClick={() => (isPlaying ? onStop(sound.id) : onPlay(sound))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                isPlaying
                  ? 'bg-rose-950/50 hover:bg-rose-900 text-rose-400 border border-rose-500/20 animate-pulse'
                  : 'bg-slate-850 hover:bg-slate-850 border border-slate-800 text-slate-300'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square size={12} fill="currentColor" /> STOP
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" /> TEST
                </>
              )}
            </button>
            <button
              type="button"
              id={`cue-toggle-btn-${sound.id}`}
              onClick={() => onToggleNextCue(sound.id)}
              className={`px-2 py-2 rounded-lg border transition ${
                isNextCue
                  ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                  : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle as Next Cue"
            >
              <AlertCircle size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* ================= LIVE MODE (TACTILE PERFORMANCE STATE) ================= */
        <div className="flex flex-col flex-1 gap-2 h-full justify-between select-none">
          {/* Top Info Header */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="truncate pr-4">
              <h3 className={`font-bold text-sm tracking-tight truncate text-white`}>
                {sound.name}
              </h3>
              <p className="text-[10px] font-mono text-slate-500 lowercase mt-0.5">
                {sound.isCustom ? 'custom upload' : `synth:${sound.synthType}`}
              </p>
            </div>

            {/* Next Cue & ShortCut tags */}
            <div className="flex items-center gap-1.5 shrink-0 font-mono">
              {sound.keyShortcut ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
                  [{sound.keyShortcut}]
                </span>
              ) : null}
              {sound.isLooping && (
                <span className={`text-[10px] px-1 bg-slate-950 rounded border ${isPlaying ? styles.borderActive : 'border-slate-800'} ${styles.text}`}>
                  ∞
                </span>
              )}
            </div>
          </div>

          {/* Tactile Perform Trigger button */}
          <button
            type="button"
            id={`perform-play-btn-${sound.id}`}
            onClick={() => onPlay(sound)}
            className={`w-full group/btn relative overflow-hidden rounded-lg min-h-[56px] border flex items-center justify-center transition-all duration-200 active:scale-95 ${
              isPlaying
                ? `${styles.borderActive} bg-slate-950 text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]`
                : `${styles.border} bg-slate-900 text-slate-400 ${styles.buttonHover}`
            }`}
          >
            {/* Pulsing inner aura when playing */}
            {isPlaying && (
              <span className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none`} />
            )}

            <div className="flex items-center gap-2 z-10">
              {isPlaying ? (
                <>
                  <span className="flex gap-0.5 items-end justify-center h-4 w-4">
                    <span className={`w-0.5 rounded-full animate-[bounce_0.6s_infinite] ${styles.indicator}`} style={{ animationDelay: '0.1s', height: '100%' }} />
                    <span className={`w-0.5 rounded-full animate-[bounce_0.6s_infinite] ${styles.indicator}`} style={{ animationDelay: '0.4s', height: '60%' }} />
                    <span className={`w-0.5 rounded-full animate-[bounce_0.6s_infinite] ${styles.indicator}`} style={{ animationDelay: '0.2s', height: '80%' }} />
                  </span>
                  <span className={`text-xs font-bold tracking-widest uppercase ${styles.text}`}>PLAYING</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" className="opacity-60 group-hover/btn:opacity-100 group-hover/btn:scale-110 transition-all text-white" />
                  <span className="text-xs font-bold tracking-widest text-[#ececee] uppercase group-hover/btn:text-white">TRIGGER</span>
                </>
              )}
            </div>
          </button>

          {/* Footer bar: Cue state control, play stop and performance indicators */}
          <div className="flex items-center justify-between text-[11px] h-6">
            <button
              type="button"
              id={`cue-toggle-live-btn-${sound.id}`}
              onClick={() => onToggleNextCue(sound.id)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] transition font-bold uppercase ${
                isNextCue
                  ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                  : 'bg-slate-950 text-slate-500 hover:text-slate-400 border border-slate-850'
              }`}
            >
              <AlertCircle size={10} />
              {isNextCue ? 'NEXT CUE' : 'MARK NEXT'}
            </button>

            {/* Quick stop for active loops */}
            {isPlaying ? (
              <button
                type="button"
                id={`perform-stop-btn-${sound.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onStop(sound.id);
                }}
                className="flex items-center gap-1 text-[10px] font-mono uppercase bg-rose-950/60 text-rose-400 px-1.5 py-0.5 border border-rose-500/20 rounded hover:bg-rose-900 transition"
              >
                <Square size={9} fill="currentColor" /> STOP
              </button>
            ) : (
              <span className="text-[10px] font-mono text-slate-600 select-none">
                {sound.playCount > 0 ? `fired ${sound.playCount}x` : 'standby'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
