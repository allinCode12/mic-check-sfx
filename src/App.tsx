import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  Square,
  Radio,
  Download,
  Upload,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  VolumeX,
  PlusCircle,
  PlayCircle,
  TrendingUp,
  FileMusic
} from 'lucide-react';

import { SFXSound, RadioPlayScript } from './types';
import { DEFAULT_RADIO_PLAY } from './utils/defaultScript';
import { getAudioFile } from './utils/audioDb';
import { audioEngine } from './utils/audioEngine';

import ScriptPanel from './components/ScriptPanel';
import SFXPad from './components/SFXPad';
import SoundCreator from './components/SoundCreator';
import MasterVisualizer from './components/MasterVisualizer';
import BGMController from './components/BGMController';

const PRESET_SOUNDS: SFXSound[] = [
  {
    id: 'snd_hum',
    name: 'Engine Hum 🛸',
    color: 'blue',
    keyShortcut: '1',
    isLooping: true,
    volume: 0.5,
    isCustom: false,
    synthType: 'hum',
    playCount: 0,
    order: 0,
  },
  {
    id: 'snd_alarm',
    name: 'AI Alarm 🚨',
    color: 'magenta',
    keyShortcut: '2',
    isLooping: true,
    volume: 0.45,
    isCustom: false,
    synthType: 'alarm',
    playCount: 0,
    order: 1,
  },
  {
    id: 'snd_spark',
    name: 'Static Spark ⚡',
    color: 'amber',
    keyShortcut: '3',
    isLooping: false,
    volume: 0.7,
    isCustom: false,
    synthType: 'spark',
    playCount: 0,
    order: 2,
  },
  {
    id: 'snd_subdrop',
    name: 'Sub Drop 🔈',
    color: 'purple',
    keyShortcut: '4',
    isLooping: false,
    volume: 0.8,
    isCustom: false,
    synthType: 'subdrop',
    playCount: 0,
    order: 3,
  },
  {
    id: 'snd_shatter',
    name: 'Digital Shatter 💎',
    color: 'rose',
    keyShortcut: '5',
    isLooping: false,
    volume: 0.75,
    isCustom: false,
    synthType: 'shatter',
    playCount: 0,
    order: 4,
  },
  {
    id: 'snd_portal',
    name: 'Portal Whoosh 🌀',
    color: 'cyan',
    keyShortcut: '6',
    isLooping: false,
    volume: 0.7,
    isCustom: false,
    synthType: 'portal',
    playCount: 0,
    order: 5,
  },
  {
    id: 'snd_laser',
    name: 'Retro Laser ⚡',
    color: 'green',
    keyShortcut: '7',
    isLooping: false,
    volume: 0.65,
    isCustom: false,
    synthType: 'laser',
    playCount: 0,
    order: 6,
  },
  {
    id: 'snd_buzz',
    name: 'Buzzer ⚠️',
    color: 'yellow',
    keyShortcut: '8',
    isLooping: false,
    volume: 0.7,
    isCustom: false,
    synthType: 'buzz',
    playCount: 0,
    order: 7,
  },
];

export default function App() {
  const [sounds, setSounds] = useState<SFXSound[]>(() => {
    const saved = localStorage.getItem('micchecksfx_sounds');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not parse saved sounds config on init:', e);
      }
    }
    return PRESET_SOUNDS;
  });

  const [script, setScript] = useState<RadioPlayScript>(() => {
    const saved = localStorage.getItem('micchecksfx_script');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not parse saved screenplay script on init:', e);
      }
    }
    return DEFAULT_RADIO_PLAY;
  });

  const [activeLineId, setActiveLineId] = useState<number>(1);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(true); // practice/edit mode vs live performance
  const [nextCueId, setNextCueId] = useState<string | null>(null);
  
  const [masterVolume, setMasterVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playingStateMap, setPlayingStateMap] = useState<{ [soundId: string]: boolean }>({});
  
  // App UI Helpers
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(true);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-cache custom uploaded audio blobs from IndexedDB on components mount
  useEffect(() => {
    sounds.forEach(async (sound) => {
      if (sound.isCustom && sound.customFileId) {
        const fileBlob = await getAudioFile(sound.customFileId);
        if (fileBlob) {
          await audioEngine.cacheFile(sound.customFileId, fileBlob);
        }
      }
    });
  }, []);

  // Save states to LocalStorage on modifications
  useEffect(() => {
    if (sounds.length > 0) {
      localStorage.setItem('micchecksfx_sounds', JSON.stringify(sounds));
    }
  }, [sounds]);

  useEffect(() => {
    localStorage.setItem('micchecksfx_script', JSON.stringify(script));
  }, [script]);

  // Fast poll interval (100ms) to sync active voice indicators in real-time
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const activeMap: { [id: string]: boolean } = {};
      sounds.forEach((sound) => {
        activeMap[sound.id] = audioEngine.isSoundPlaying(sound.id);
      });
      setPlayingStateMap(activeMap);
    }, 100);

    return () => clearInterval(pollInterval);
  }, [sounds]);

  // Handle master volume adjustments
  useEffect(() => {
    audioEngine.setMasterVolume(isMuted ? 0 : masterVolume);
  }, [masterVolume, isMuted]);

  // Master Sound Play Trigger
  const triggerPlaySound = useCallback(async (sound: SFXSound) => {
    // Auto-initialize Audio Context if requested first time
    audioEngine.init();

    // Increment local stats play count
    setSounds((prev) =>
      prev.map((s) => (s.id === sound.id ? { ...s, playCount: s.playCount + 1 } : s))
    );

    if (sound.isCustom) {
      if (!sound.customFileId) {
        console.error('Sound declared as custom but holds no file record ID.');
        return;
      }

      const fileBlob = await getAudioFile(sound.customFileId);
      if (!fileBlob) {
        console.error('Audio asset was missing inside IndexedDB for ID:', sound.id);
        return;
      }

      await audioEngine.playFile(sound.id, sound.customFileId, fileBlob, sound.volume, sound.isLooping);
    } else {
      if (!sound.synthType) return;
      audioEngine.playSynth(sound.id, sound.synthType, sound.volume, sound.isLooping);
    }
  }, []);

  const triggerStopSound = useCallback((soundId: string) => {
    audioEngine.stopSound(soundId);
  }, []);

  const triggerStopAll = useCallback(() => {
    audioEngine.stopAll();
  }, []);

  const toggleNextCue = useCallback((soundId: string) => {
    setNextCueId((prev) => (prev === soundId ? null : soundId));
  }, []);

  // Sync cue trigger from raw clicking formatted SFX script badges
  const handleTriggerSFXCue = useCallback((cueName: string) => {
    // Attempt to search our audio nodes matching the cue name
    const matches = sounds.find(
      (s) => s.name.toLowerCase().includes(cueName.toLowerCase()) || cueName.toLowerCase().includes(s.name.toLowerCase())
    );

    if (matches) {
      // Toggle or trigger matches directly
      triggerPlaySound(matches);
      // Additionally flag it automatically as the Next Cue so they see visual focus
      setNextCueId(matches.id);
    } else {
      console.warn(`No active soundboard pads correspond to the script cue: "${cueName}"`);
    }
  }, [sounds, triggerPlaySound]);

  // Sync background music cue trigger
  const handleTriggerBGMCue = useCallback(async (cueName: string) => {
    const cleanCue = cueName.trim().toLowerCase();
    
    if (cleanCue === 'stop' || cleanCue === 'stop bgm' || cleanCue === 'mute bgm' || cleanCue === 'pause' || cleanCue === 'off') {
      audioEngine.stopBGM();
      return;
    }

    // Try to trigger procedural cosmic drone synth
    if (cleanCue.includes('cosmic') || cleanCue.includes('drone') || cleanCue.includes('synth') || cleanCue.includes('ambient')) {
      audioEngine.playProceduralBGM(0.4);
      return;
    }

    // Attempt to play user uploaded customized tracks matching the cue by name
    const savedTracksText = localStorage.getItem('micchecksfx_bgm_tracks');
    if (savedTracksText) {
      try {
        const parsed = JSON.parse(savedTracksText);
        const match = parsed.find((t: any) => 
          t.name.toLowerCase().includes(cleanCue) || cleanCue.includes(t.name.toLowerCase())
        );
        if (match && match.customFileId) {
          const fileBlob = await getAudioFile(match.customFileId);
          if (fileBlob) {
            audioEngine.playBGM(match.id, fileBlob, 0.4, true);
          }
        }
      } catch (e) {
        console.warn('Error fetching BGM tracks for cue matching', e);
      }
    }
  }, []);

  // Global Key Shortcut Listener (safely skips keypresses inside textareas or input blocks)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if (isTyping) return; // skip if editing

      const key = e.key.toLowerCase();

      // Mute key
      if (key === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
        return;
      }

      // Panic Space bar key -> Plays next cue and advances active script line!
      if (e.code === 'Space') {
        e.preventDefault();
        if (nextCueId) {
          const targetSound = sounds.find((s) => s.id === nextCueId);
          if (targetSound) {
            triggerPlaySound(targetSound);
          }
        }

        // Advance to next script line
        const currentIndex = script.lines.findIndex((l) => l.id === activeLineId);
        if (currentIndex < script.lines.length - 1) {
          setActiveLineId(script.lines[currentIndex + 1].id);
        }
        return;
      }

      // Panic global stop key
      if (key === 'escape') {
        e.preventDefault();
        triggerStopAll();
        return;
      }

      // Script advancement keys (ArrowUp, ArrowDown, Enter)
      if (key === 'arrowdown' || key === 'enter') {
        e.preventDefault();
        const currentIndex = script.lines.findIndex((l) => l.id === activeLineId);
        if (currentIndex < script.lines.length - 1) {
          setActiveLineId(script.lines[currentIndex + 1].id);
        }
        return;
      }

      if (key === 'arrowup') {
        e.preventDefault();
        const currentIndex = script.lines.findIndex((l) => l.id === activeLineId);
        if (currentIndex > 0) {
          setActiveLineId(script.lines[currentIndex - 1].id);
        }
        return;
      }

      // Match shortcut mappings
      const matchedSound = sounds.find((s) => s.keyShortcut.toLowerCase() === key);
      if (matchedSound) {
        e.preventDefault();
        triggerPlaySound(matchedSound);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sounds, nextCueId, script, activeLineId, triggerPlaySound, triggerStopAll]);

  // Sound modifications
  const handleUpdateSound = (soundId: string, updatedFields: Partial<SFXSound>) => {
    setSounds((prev) =>
      prev.map((s) => (s.id === soundId ? { ...s, ...updatedFields } : s))
    );
  };

  const handleDeleteSound = (soundId: string) => {
    // Stop sound in active voice mapping first
    audioEngine.stopSound(soundId);
    audioEngine.evictCache(soundId);
    // filter state
    setSounds((prev) => prev.filter((s) => s.id !== soundId).map((s, idx) => ({ ...s, order: idx })));
    if (nextCueId === soundId) {
      setNextCueId(null);
    }
  };

  const handleCreateSound = (newSound: SFXSound) => {
    setSounds((prev) => [...prev, newSound]);
  };

  // Reorder sounds in Practice Mode (drag and drop or arrow taps)
  const handleMoveSound = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sounds.length) return;

    const list = [...sounds];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    const reordered = list.map((s, idx) => ({ ...s, order: idx }));
    setSounds(reordered);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnPad = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId === targetId) return;

    const sourceIdx = sounds.findIndex((s) => s.id === sourceId);
    const targetIdx = sounds.findIndex((s) => s.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const list = [...sounds];
    const [moved] = list.splice(sourceIdx, 1);
    list.splice(targetIdx, 0, moved);

    const reordered = list.map((s, idx) => ({ ...s, order: idx }));
    setSounds(reordered);
  };

  // Save/Restore Board JSON Backups
  const handleExportBoard = () => {
    const boardState = {
      description: 'Mic Check SFX Board Backup',
      exportDate: new Date().toISOString(),
      script,
      sounds: sounds.map((s) => ({
        ...s,
        // Expel potential binary storage ids from raw text json for portable sizes
        isCustom: s.isCustom,
        customFileId: s.customFileId,
      })),
    };

    const dataString = JSON.stringify(boardState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataString);

    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `miccheck_sfx_backup_${script.title.replace(/\s+/g, '_').toLowerCase()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBoardClick = () => {
    importInputRef.current?.click();
  };

  const handleImportBoardFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.script) {
          setScript(parsed.script);
        }
        if (parsed.sounds) {
          // Re-load imported elements, treating original presets safely
          setSounds(parsed.sounds);
        }
        alert('SFX Board and Screenplay imported successfully!');
      } catch (err) {
        alert('Invalid backup JSON format. Import failed.');
      }
    };
    reader.readAsText(file);
  };

  // Sorted sounds
  const sortedSounds = [...sounds].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden antialiased">
      {/* Dynamic Background Cyber-glow Atmosphere Nodes */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-950/20 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-fuchsia-950/15 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Main App Bar Header */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 sticky top-0 z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] ring-1 ring-white/10 shrink-0">
            <Radio className="text-black animate-pulse" size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-base sm:text-lg tracking-tight text-white leading-none">Mic Check SFX</h1>
              <span className="text-[10px] bg-slate-900 text-cyan-400 font-mono px-1.5 py-0.5 rounded border border-cyan-500/10 uppercase tracking-widest font-bold">PRO DECK</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block font-mono">Live Radio Play Sound effects & Sync Engine</p>
          </div>
        </div>

        {/* Global Master Mixer Console */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Practice vs Live Toggle Panel */}
          <div className="bg-slate-900 border border-slate-800/80 p-1.5 rounded-xl flex items-center h-10 select-none">
            <button
              type="button"
              id="mode-practice-btn"
              onClick={() => setIsPracticeMode(true)}
              className={`px-3 py-1 text-xs font-semibold font-mono tracking-wider uppercase rounded-lg transition-all ${
                isPracticeMode
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/10 font-bold'
                  : 'text-slate-500 hover:text-slate-350 bg-transparent'
              }`}
            >
              PRACTICE BUILD
            </button>
            <button
              type="button"
              id="mode-live-btn"
              onClick={() => {
                setIsPracticeMode(false);
                setShowInfoPanel(false);
              }}
              className={`px-3 py-1 text-xs font-semibold font-mono tracking-wider uppercase rounded-lg transition-all flex items-center gap-1.5 ${
                !isPracticeMode
                  ? 'bg-rose-950 text-rose-400 border border-rose-500/15 font-bold animate-pulse'
                  : 'text-slate-500 hover:text-slate-350 bg-transparent'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              LIVE ON-AIR
            </button>
          </div>

          {/* Master Volume Slider */}
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-xl flex items-center gap-2.5 h-10 select-none">
            <button
              type="button"
              id="master-mute-toggle-btn"
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1.5 rounded-lg hover:bg-slate-800/80 transition ${isMuted ? 'text-rose-500 bg-rose-950/20' : 'text-slate-400 hover:text-white'}`}
              title={isMuted ? 'Unmute Master' : 'Mute Master'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="flex items-center gap-2 pr-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                onChange={(e) => {
                  setMasterVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-18 xs:w-24 h-1 accent-cyan-500 rounded-lg cursor-pointer bg-slate-950"
              />
              <span className="text-[10px] font-mono text-slate-400 min-w-[24px] text-right">
                {isMuted ? 'MUTED' : `${Math.round(masterVolume * 100)}%`}
              </span>
            </div>
          </div>

          {/* Master Panic & Backup controls */}
          <button
            type="button"
            id="global-stop-panic-btn"
            onClick={triggerStopAll}
            className="h-10 px-4 bg-rose-600 hover:bg-rose-500 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 uppercase tracking-widest font-mono shrink-0"
            title="Panic Stop (Escape Key)"
          >
            <Square size={13} fill="currentColor" />
            PANIC STOP
          </button>
        </div>
      </header>

      {/* Info Tips Panel */}
      <AnimatePresence>
        {showInfoPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-cyan-950/25 border-b border-cyan-800/30 overflow-hidden shrink-0"
          >
            <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-start sm:items-center gap-2 text-cyan-300">
                <Info size={16} className="shrink-0 text-cyan-400 mt-0.5 sm:mt-0" />
                <p className="leading-relaxed">
                  <b>Quick-Tips:</b> Tap keyboard shortcuts <b>[1] to [8]</b> for instant audio cues.
                  Press <b>[Spacebar]</b> to simultaneously play the <b>NEXT CUE</b> and advance the screenplay! Use <b>[Escape]</b> to instantly silence the deck.
                </p>
              </div>
              <button
                type="button"
                id="close-info-btn"
                onClick={() => setShowInfoPanel(false)}
                className="text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-900/30 px-2 py-1 rounded bg-transparent font-mono cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Panels Dashboard Board Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch overflow-hidden">
        
        {/* LEFT COLUMN: Screenplay Script Viewer Panel */}
        <section className="lg:col-span-5 h-[500px] lg:h-[calc(100vh-210px)] flex flex-col min-h-0">
          <ScriptPanel
            script={script}
            activeLineId={activeLineId}
            setActiveLineId={setActiveLineId}
            isPracticeMode={isPracticeMode}
            onUpdateScript={setScript}
            onTriggerSFXCue={handleTriggerSFXCue}
            onTriggerBGMCue={handleTriggerBGMCue}
          />
        </section>

        {/* RIGHT COLUMN: SFX Library Deck Control panel */}
        <section className="lg:col-span-7 h-auto lg:h-[calc(100vh-210px)] flex flex-col gap-5 min-h-0">
          
          {/* Performance Real-Time Master Wave Visualizer */}
          <div className="shrink-0">
            <MasterVisualizer />
          </div>

          {/* Background Ambient Music Controller */}
          <div className="shrink-0">
            <BGMController />
          </div>

          {/* Dynamic Playback controls & File configuration panel */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40 border border-slate-800 rounded-xl p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h2 className="text-sm font-bold tracking-wider font-mono text-slate-300 uppercase">
                  {isPracticeMode ? 'SFX BOARD BUILDER' : 'ON-AIR SFX LAUNCHPAD'}
                </h2>
              </div>

              {/* Master IO backups */}
              {isPracticeMode ? (
                <div className="flex items-center gap-2 font-mono">
                  <button
                    type="button"
                    id="export-sfx-set-btn"
                    onClick={handleExportBoard}
                    className="p-1 px-2 rounded hover:bg-slate-800 text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                    title="Export SFX configurations"
                  >
                    <Download size={12} />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleImportBoardClick}
                    className="p-1 px-2 rounded hover:bg-slate-800 text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                    title="Import board JSON backup"
                  >
                    <Upload size={12} />
                    Import JSON
                  </button>
                  <input
                    type="file"
                    ref={importInputRef}
                    onChange={handleImportBoardFile}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-yellow-500 animate-pulse">
                  <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">
                    {nextCueId ? `Next up: ${sounds.find(s => s.id === nextCueId)?.name}` : 'No cue queued'}
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable triggers listing */}
            <div
              className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800"
              onDragOver={handleDragOver}
            >
              {sounds.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 border border-dashed border-slate-800 rounded-xl text-center">
                  <FileMusic size={32} className="text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400 font-semibold">Ready to begin</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                    Build a synthesized audio effect below or drag custom media formats to load your classroom play board!
                  </p>
                </div>
              ) : (
                /* SFX Cards grid layout */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-2">
                  {sortedSounds.map((sound, idx) => (
                    <div
                      key={sound.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnPad(e, sound.id)}
                    >
                      <SFXPad
                        sound={sound}
                        isPlaying={!!playingStateMap[sound.id]}
                        isNextCue={nextCueId === sound.id}
                        isPracticeMode={isPracticeMode}
                        onPlay={triggerPlaySound}
                        onStop={triggerStopSound}
                        onToggleNextCue={toggleNextCue}
                        onUpdate={handleUpdateSound}
                        onDelete={handleDeleteSound}
                        onMoveUp={() => handleMoveSound(idx, 'up')}
                        onMoveDown={() => handleMoveSound(idx, 'down')}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Soundboard creation forms, nested neatly in practice mode */}
              {isPracticeMode && (
                <div className="pt-4 border-t border-slate-850/70">
                  <SoundCreator onAddSound={handleCreateSound} existingSounds={sounds} />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Cyberpunk Footer bar */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-2 shrink-0 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <span>CYBER AUDIO DRIVER STABLE</span>
        </div>
        <span>MIC CHECK SESSIONS • 2026</span>
      </footer>
    </div>
  );
}
