import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, UploadCloud, Music, Trash2, HelpCircle, Activity } from 'lucide-react';
import { saveAudioFile, getAudioFile, deleteAudioFile } from '../utils/audioDb';
import { audioEngine } from '../utils/audioEngine';
import { BGMTrack } from '../types';
import { uploadMediaToDatabase, getMediaFromDatabase } from '../utils/firebaseSync';
import { PRESET_TRACKS } from '../utils/presets';

interface BGMControllerProps {
  customTracks: BGMTrack[];
  onUpdateTracks: (tracks: BGMTrack[]) => void;
}

export default function BGMController({ customTracks, onUpdateTracks }: BGMControllerProps) {
  const allTracks = [...PRESET_TRACKS, ...customTracks];
  const [selectedTrackId, setSelectedTrackId] = useState<string>('bgm_blue_drops_2nd_mix');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.4);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Sync state loop to update the interface state with audioEngine in real-time
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const details = audioEngine.getBGMDetails();
      if (details.state === 'playing') {
        setIsPlaying(true);
        setIsPaused(false);
        if (details.trackId) {
          setSelectedTrackId(details.trackId);
        }
      } else if (details.state === 'paused') {
        setIsPlaying(true);
        setIsPaused(true);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
      }
    }, 200);

    return () => clearInterval(pollInterval);
  }, []);

  // Update volume & loop settings dynamically when changed
  useEffect(() => {
    audioEngine.setBGMVolume(volume);
  }, [volume]);

  useEffect(() => {
    audioEngine.setBGMLooping(isLooping);
  }, [isLooping]);

  const handlePlay = async () => {
    audioEngine.init();

    if (isPaused) {
      audioEngine.resumeBGM(volume);
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    if (selectedTrackId === 'procedural_cosmic_drone') {
      audioEngine.playProceduralBGM(volume);
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      const track = allTracks.find(t => t.id === selectedTrackId);
      if (track) {
        let fileBlob = track.customFileId ? await getAudioFile(track.customFileId) : null;
        // If not in local IndexedDB, try fetching from static URL or Firebase RTDB
        if (!fileBlob && track.url) {
          try {
            if (track.url.startsWith('data:')) {
              // data: URL — fetch directly
              const res = await fetch(track.url);
              if (res.ok) {
                fileBlob = await res.blob();
                if (track.customFileId) {
                  await saveAudioFile(track.customFileId, fileBlob);
                }
              }
            } else if (!track.isCustom) {
              // Static preset URL — fetch directly
              const res = await fetch(track.url);
              if (res.ok) {
                fileBlob = await res.blob();
              }
            } else {
              // Try Firebase RTDB first (base64 stored media)
              const originalName = track.name.replace(' 🎵', '').replace(/\s/g, '_');
              const rtdbBlob = await getMediaFromDatabase(originalName);
              if (rtdbBlob) {
                fileBlob = rtdbBlob;
                if (track.customFileId) {
                  await saveAudioFile(track.customFileId, fileBlob);
                }
              }
            }
          } catch (e) {
            console.warn('Failed to fetch BGM track from Firebase/URL:', e);
          }
        }
        if (fileBlob) {
          audioEngine.playBGM(track.id, fileBlob, volume, isLooping);
          setIsPlaying(true);
          setIsPaused(false);
        } else {
          setUploadError('Could not load BGM track data from storage or URL.');
        }
      }
    }
  };

  const handlePause = () => {
    audioEngine.pauseBGM();
    setIsPaused(true);
  };

  const handleStop = () => {
    audioEngine.stopBGM();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setUploadError('');
    setIsUploading(true);

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && !file.name.endsWith('.ogg')) {
      setUploadError('Format support: MP3, WAV or OGG background music files.');
      setIsUploading(false);
      return;
    }

    try {
      const trackId = `bgm_${Date.now()}`;
      // Save locally first for instant availability
      await saveAudioFile(trackId, file);

      const newTrack: BGMTrack = {
        id: trackId,
        name: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') + ' 🎵',
        isCustom: true,
        customFileId: trackId
      };

      // Add to UI immediately so the user doesn't wait
      const updatedCustom = [...customTracks, newTrack];
      onUpdateTracks(updatedCustom);
      setSelectedTrackId(trackId);
      setIsUploading(false); // Stop loader immediately since local save succeeded

      // Now attempt Firebase upload in background if it's within a safe size (e.g. 8MB)
      if (file.size > 8 * 1024 * 1024) {
        console.warn('BGM file is too large for database sync (>8MB). Stored locally only.');
        setUploadError('BGM is too large for cloud sync (>8MB). Saved locally on this device.');
      } else {
        // Perform non-blocking cloud upload
        uploadMediaToDatabase(file.name, file)
          .then((dataUrl) => {
            // Update URL in track list if successful
            newTrack.url = dataUrl;
            onUpdateTracks([...customTracks, newTrack]);
            setUploadError('✅ Cloud sync complete! Available on all devices.');
            setTimeout(() => setUploadError(''), 4000);
          })
          .catch((firebaseErr) => {
            console.warn('Failed to upload BGM to Firebase RTDB:', firebaseErr);
            setUploadError('⚠️ Local-only: Could not upload to cloud (saved on this device).');
          });
      }
    } catch (err) {
      setUploadError('Failed storing local music file in system.');
      setIsUploading(false);
    }
  };

  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Stop if currently playing
    if (audioEngine.getBGMDetails().trackId === id) {
      audioEngine.stopBGM();
    }

    await deleteAudioFile(id);
    const updatedCustom = customTracks.filter(t => t.id !== id);
    onUpdateTracks(updatedCustom);

    if (selectedTrackId === id) {
      setSelectedTrackId('procedural_cosmic_drone');
    }
  };

  return (
    <div id="bgm-panel" className="bg-[#0d1117]/90 border border-white/5 rounded-xl p-4 shadow-lg flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Music size={16} className="text-cyan-400 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 font-mono">
            Ambient Background Core
          </h2>
        </div>
        
        {/* State Label */}
        {isPlaying ? (
          <div className="flex items-center gap-1 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] text-cyan-400 font-mono">
            <Activity size={10} className="animate-pulse" />
            <span>{isPaused ? 'PAUSED' : 'LIVE DRONE'}</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded bg-black/30 border border-slate-800">
            OFFLINE
          </div>
        )}
      </div>

      {/* Main Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Selector dropdown and file drop zone */}
        <div className="md:col-span-6 space-y-2">
          <label className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Select Score / Ambient Track
          </label>
          <div className="flex gap-2">
            <select
              value={selectedTrackId}
              onChange={(e) => {
                setSelectedTrackId(e.target.value);
                if (isPlaying) handleStop(); // Stop current playing to swap tracks smoothly
              }}
              className="flex-1 bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {allTracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
            
            {/* Delete button if custom track */}
            {allTracks.find(t => t.id === selectedTrackId)?.isCustom && (
              <button
                type="button"
                onClick={(e) => handleDeleteTrack(selectedTrackId, e)}
                className="p-1 px-2.5 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900 text-slate-400 hover:text-rose-400 rounded transition"
                title="Remove Custom BGM"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Tactile Deck Player Buttons */}
        <div className="md:col-span-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Audio Transport controls */}
          <div className="flex-1 flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-850">
            {isPlaying && !isPaused ? (
              <button
                type="button"
                onClick={handlePause}
                className="flex-1 py-1.5 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/40 text-cyan-400 font-bold text-xs font-mono uppercase tracking-wider rounded flex items-center justify-center gap-1 transition"
                title="Pause Ambient Music"
              >
                <Pause size={12} fill="currentColor" /> PAUSE
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlay}
                className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold text-xs font-mono uppercase tracking-widest rounded flex items-center justify-center gap-1 transition shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                title="Play Background Ambient Music"
              >
                <Play size={12} fill="currentColor" /> PLAY
              </button>
            )}
            
            <button
              type="button"
              onClick={handleStop}
              disabled={!isPlaying}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-400 hover:text-white border border-slate-800 rounded text-xs font-mono transition"
              title="Stop Score"
            >
              <Square size={12} fill="currentColor" />
            </button>
          </div>

          {/* Autoloop toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white select-none shrink-0 font-mono text-[10px]">
            <input
              type="checkbox"
              checked={isLooping}
              onChange={(e) => setIsLooping(e.target.checked)}
              className="rounded border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 w-4 h-4"
            />
            <span className="uppercase font-bold">AUTOLOOP TRACK</span>
          </label>
        </div>
      </div>

      {/* Volume and upload zone in Practice mode */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-white/5 items-center">
        {/* Track Specific Volume */}
        <div className="md:col-span-6 flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wild flex items-center gap-1 shrink-0">
            <Volume2 size={11} /> Ambient Vol
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 accent-cyan-400 bg-slate-950 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] font-mono text-cyan-400 min-w-[24px] text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Quick Upload Drag/Drop field */}
        <div className="md:col-span-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded px-3 py-1.5 text-center cursor-pointer transition flex items-center justify-center gap-2 text-slate-500 hover:text-slate-355 ${
              isDragging
                ? 'border-cyan-500 bg-cyan-950/10'
                : 'border-slate-800 bg-black/40 hover:bg-black/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept="audio/*"
              className="hidden"
            />
            {isUploading ? (
              <span className="text-[10px] font-mono text-cyan-400 animate-pulse">Streaming track file into memory...</span>
            ) : (
              <>
                <UploadCloud size={13} className="text-slate-400" />
                <span className="text-[10px] font-mono text-slate-300">
                  Drag & Drop or <span className="text-cyan-400 font-bold underline">Upload music</span> (MP3/WAV/OGG)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error report */}
      {uploadError && (
        <div className="text-[10px] font-mono text-rose-400 bg-rose-950/20 border border-rose-950 p-2 rounded">
          {uploadError}
        </div>
      )}
    </div>
  );
}
