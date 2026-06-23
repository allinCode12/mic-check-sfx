import React, { useState, useEffect, useRef } from 'react';
import { ScriptLine, RadioPlayScript } from '../types';
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, Edit2, PlayCircle, Radio, Clock, AlertTriangle } from 'lucide-react';

interface ScriptPanelProps {
  script: RadioPlayScript;
  activeLineId: number;
  setActiveLineId: (id: number) => void;
  isPracticeMode: boolean;
  onUpdateScript: (newScript: RadioPlayScript) => void;
  onTriggerSFXCue: (cueName: string) => void;
  onTriggerBGMCue: (cueName: string) => void;
}

export default function ScriptPanel({
  script,
  activeLineId,
  setActiveLineId,
  isPracticeMode,
  onUpdateScript,
  onTriggerSFXCue,
  onTriggerBGMCue,
}: ScriptPanelProps) {
  const [isPlayingTimer, setIsPlayingTimer] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isEditingScript, setIsEditingScript] = useState<boolean>(false);
  const [rawScriptText, setRawScriptText] = useState<string>('');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active script line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeLineId]);

  // Sync Timer interval
  useEffect(() => {
    if (isPlayingTimer) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlayingTimer]);

  // Load raw text on editing open
  useEffect(() => {
    if (isEditingScript) {
      const textLines = script.lines.map((line) => {
        if (line.character) {
          return `${line.character}: ${line.text}`;
        }
        return line.text;
      });
      setRawScriptText(textLines.join('\n'));
    }
  }, [isEditingScript, script]);

  // Reset Timer
  const handleResetTimer = () => {
    setIsPlayingTimer(false);
    setTimerSeconds(0);
  };

  const formatTime = (totalSecs: number): string => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Process manual advance
  const handleNextLine = () => {
    const currentIndex = script.lines.findIndex((l) => l.id === activeLineId);
    if (currentIndex < script.lines.length - 1) {
      setActiveLineId(script.lines[currentIndex + 1].id);
    }
  };

  const handlePrevLine = () => {
    const currentIndex = script.lines.findIndex((l) => l.id === activeLineId);
    if (currentIndex > 0) {
      setActiveLineId(script.lines[currentIndex - 1].id);
    }
  };

  // Parse raw text back to ScriptLine structure
  const handleSaveScript = () => {
    const rawLines = rawScriptText.split('\n').filter((l) => l.trim().length > 0);
    const parsedLines: ScriptLine[] = rawLines.map((lineText, idx) => {
      const match = lineText.match(/^([^:]+):\s*(.*)$/);
      let character: string | undefined = undefined;
      let text = lineText.trim();

      if (match) {
        character = match[1].trim().toUpperCase();
        text = match[2].trim();
      }

      // Detect SFX cue pattern e.g. [SFX: Portal Whoosh]
      const sfxMatch = text.match(/\[SFX:\s*([^\]]+)\]/i);
      const sfxCue = sfxMatch ? sfxMatch[1].trim() : undefined;

      // Detect BGM cue pattern e.g. [BGM: Space Drone]
      const bgmMatch = text.match(/\[BGM:\s*([^\]]+)\]/i);
      const bgmCue = bgmMatch ? bgmMatch[1].trim() : undefined;

      return {
        id: idx + 1,
        character,
        text,
        sfxCue,
        bgmCue,
      };
    });

    onUpdateScript({
      title: script.title || 'Custom Radio Play',
      author: script.author || 'Author',
      lines: parsedLines,
    });
    setIsEditingScript(false);
    if (parsedLines.length > 0) {
      setActiveLineId(parsedLines[0].id);
    }
  };

  // Highlights raw text for SFX Cues & BGM Cues
  const renderLineText = (line: ScriptLine) => {
    const combinedRegex = /(\[SFX:\s*[^\]]+\]|\[BGM:\s*[^\]]+\])/gi;
    const parts = line.text.split(combinedRegex);

    if (parts.length <= 1) {
      return <span>{line.text}</span>;
    }

    return (
      <span>
        {parts.map((part, i) => {
          const isSfx = part.match(/^\[SFX:\s*([^\]]+)\]/i);
          const isBgm = part.match(/^\[BGM:\s*([^\]]+)\]/i);

          if (isSfx) {
            const cueName = isSfx[1].trim();
            return (
              <button
                key={i}
                type="button"
                id={`cue-trigger-${cueName.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerSFXCue(cueName);
                }}
                className="mx-1 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black transition-all cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.2)] active:scale-95 animate-pulse"
              >
                <PlayCircle size={12} className="shrink-0 text-cyan-400" />
                {part}
              </button>
            );
          }

          if (isBgm) {
            const cueName = isBgm[1].trim();
            const isStop = cueName.toLowerCase() === 'stop';
            return (
              <button
                key={i}
                type="button"
                id={`bgm-trigger-${cueName.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerBGMCue(cueName);
                }}
                className={`mx-1 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-md ${
                  isStop
                    ? 'bg-rose-950/80 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-black'
                    : 'bg-purple-950/80 text-purple-300 border border-purple-500/50 hover:bg-purple-400 hover:text-black'
                }`}
              >
                <Radio size={12} className="shrink-0" />
                {part}
              </button>
            );
          }

          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  const progressPercentage = script.lines.length
    ? Math.round(
        ((script.lines.findIndex((l) => l.id === activeLineId) + 1) / script.lines.length) * 100
      )
    : 0;

  return (
    <div id="radio-script-panel" className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Script Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 shrink-0 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] font-mono text-rose-500 font-bold uppercase">LIVE SESSION</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mt-0.5 truncate max-w-[200px] sm:max-w-xs">{script.title}</h2>
          <p className="text-xs text-slate-400">Written by {script.author}</p>
        </div>

        <div className="flex items-center gap-2">
          {isPracticeMode && (
            <button
              type="button"
              id="edit-script-toggle-btn"
              onClick={() => setIsEditingScript(!isEditingScript)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-1 transition-all"
            >
              <Edit2 size={13} />
              {isEditingScript ? 'Back to Play' : 'Edit Script'}
            </button>
          )}

          {/* Performance Stopwatch */}
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-cyan-400 text-sm font-semibold min-w-[50px]">
              <Clock size={13} className="text-slate-400 animate-pulse" />
              {formatTime(timerSeconds)}
            </div>
            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              <button
                type="button"
                id="timer-play-pause-btn"
                onClick={() => setIsPlayingTimer(!isPlayingTimer)}
                className={`p-1 rounded text-xs hover:bg-slate-800 transition-colors ${isPlayingTimer ? 'text-amber-400' : 'text-emerald-400'}`}
                title={isPlayingTimer ? 'Pause' : 'Start Performance'}
              >
                {isPlayingTimer ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                type="button"
                id="timer-reset-btn"
                onClick={handleResetTimer}
                className="p-1 rounded text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Reset Timer"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isEditingScript ? (
        /* Edit Mode Container */
        <div className="p-4 flex flex-col flex-1 overflow-hidden bg-slate-900">
          <div className="mb-2 shrink-0">
            <label className="block text-xs font-mono font-bold text-slate-400 uppercase mb-1">
              Edit Radio Script Title & Author
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                type="text"
                value={script.title}
                onChange={(e) => onUpdateScript({ ...script, title: e.target.value })}
                className="bg-slate-950 border border-slate-800 text-sm text-white px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Script Title"
              />
              <input
                type="text"
                value={script.author}
                onChange={(e) => onUpdateScript({ ...script, author: e.target.value })}
                className="bg-slate-950 border border-slate-800 text-sm text-white px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Writer / Team"
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-500 font-mono mb-2">
              <AlertTriangle size={12} className="shrink-0" />
              <span>Format dialogue as: <b>CHARACTER: Dialogue content</b>. Insert sound triggers using brackets: <b>[SFX: Sound Name]</b> or <b>[BGM: Music Name] / [BGM: Stop]</b></span>
            </div>
          </div>

          <textarea
            value={rawScriptText}
            onChange={(e) => setRawScriptText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none h-full leading-5 focus:text-white"
            placeholder="NARRATOR: Sector 9 core is offline.&#10;[SFX: Retro Laser] Warning alert sounding.&#10;[BGM: Ambient Cosmic Drone]&#10;KHAN: Fire the pulse sequence!"
          />

          <div className="mt-3 shrink-0 flex items-center justify-end gap-2">
            <button
              type="button"
              id="cancel-script-edit-btn"
              onClick={() => setIsEditingScript(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-script-edit-btn"
              onClick={handleSaveScript}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              Parse & Load Script
            </button>
          </div>
        </div>
      ) : (
        /* Performance View */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable script lines */}
          <div
            ref={containerRef}
            className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-900 scrollbar-thin scrollbar-thumb-slate-800"
          >
            {script.lines.map((line, idx) => {
              const isActive = line.id === activeLineId;
              const hasCue = !!line.sfxCue;
              const hasBgmCue = !!line.bgmCue;
              
              return (
                <div
                  key={line.id}
                  ref={isActive ? activeLineRef : null}
                  id={`script-line-${line.id}`}
                  onClick={() => setActiveLineId(line.id)}
                  className={`group relative p-3 rounded-lg border text-left cursor-pointer transition-all leading-relaxed ${
                    isActive
                      ? 'bg-slate-950 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40 text-white'
                      : 'bg-slate-900/30 border-slate-800 hover:bg-slate-850 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {/* Line status flags */}
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                    {hasCue && (
                      <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded uppercase bg-cyan-950 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                        SFX Cue
                      </span>
                    )}
                    {hasBgmCue && (
                      <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded uppercase bg-purple-950 text-purple-300 border border-purple-500/20 group-hover:scale-105 transition-transform">
                        BGM Cue
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Actor Name */}
                  {line.character ? (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          line.character === 'SYSTEM'
                            ? 'bg-rose-950 text-rose-400 border border-rose-500/20'
                            : line.character === 'NARRATOR'
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/10'
                        }`}
                      >
                        {line.character}
                      </span>
                    </div>
                  ) : null}

                  {/* Script body */}
                  <div className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                    {renderLineText(line)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Telemetry & Navigation */}
          <div className="bg-slate-950 p-3 border-t border-slate-800 shrink-0 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-[200px]">
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                <span>SCENE PROGRESS</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="prev-script-line-btn"
                onClick={handlePrevLine}
                className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg active:scale-95 transition-all"
                title="Previous Line (Up Arrow)"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                id="next-script-line-btn"
                onClick={handleNextLine}
                className="px-4 py-2 text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 flex items-center gap-1.5 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.25)] active:scale-95 transition-all"
                title="Next Line (Down Arrow / Enter)"
              >
                Advance Line
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
