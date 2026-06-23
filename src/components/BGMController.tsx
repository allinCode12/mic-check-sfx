import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, UploadCloud, Music, Trash2, HelpCircle, Activity } from 'lucide-react';
import { saveAudioFile, getAudioFile, deleteAudioFile } from '../utils/audioDb';
import { audioEngine } from '../utils/audioEngine';
import { BGMTrack } from '../types';
import { pushFileToGitHub, fetchFileFromGitHub } from '../utils/githubSync';

const PRESET_TRACKS: BGMTrack[] = [
  { id: 'procedural_cosmic_drone', name: 'Ambient Cosmic Drone 🌌 (Synth)', isCustom: false },
];

interface BGMControllerProps {
  customTracks: BGMTrack[];
  onUpdateTracks: (tracks: BGMTrack[]) => void;
  githubToken?: string;
}

export default function BGMController({ customTracks, onUpdateTracks, githubToken }: BGMControllerProps) {
  const allTracks = [...PRESET_TRACKS, ...customTracks];
  const [selectedTrackId, setSelectedTrackId] = useState<string>('procedural_cosmic_drone');
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
        if (!fileBlob && track.url) {
          try {
            const baseUrl = import.meta.env.BASE_URL;
            const cleanUrl = track.url.startsWith('/') ? track.url : `${baseUrl}${track.url}`;
            const res = await fetch(cleanUrl);
            if (res.ok) {
              fileBlob = await res.blob();
              if (track.customFileId) {
                await saveAudioFile(track.customFileId, fileBlob);
              }
            }
          } catch (e) {
            console.warn('Failed to fetch BGM track from URL:', e);
          }
        }
        if (fileBlob) {
          audioEngine.playBGM(track.id, fileBlob, volume, isLooping);
          setIsPlaying(true);
          setIsPaused(false);
        } else {
          setUploadError('Could not load uploaded BGM track data from storage or URL.');
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
      await saveAudioFile(trackId, file);

      const newTrack: BGMTrack = {
        id: trackId,
        name: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') + ' 🎵',
        isCustom: true,
        customFileId: trackId
      };

      const getBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(blob);
        });
      };

      const base64 = await getBase64(file);

      if (githubToken) {
        try {
          // A. Push the media file to public/uploads/ on GitHub
          const mediaResult = await pushFileToGitHub(
            githubToken,
            `public/uploads/${file.name}`,
            base64,
            `sync: upload custom BGM file - ${file.name}`
          );

          if (mediaResult.success) {
            newTrack.url = `uploads/${file.name}`;

            // B. Update public/uploads.json in the repository
            let remoteUploads = [];
            try {
              const fetched = await fetchFileFromGitHub(githubToken, 'public/uploads.json');
              if (Array.isArray(fetched)) {
                remoteUploads = fetched;
              }
            } catch (e) {
              console.warn('Could not fetch uploads.json from GitHub, using empty fallback:', e);
            }

            if (!remoteUploads.includes(file.name)) {
              remoteUploads.push(file.name);
            }

            const listJson = JSON.stringify(remoteUploads, null, 2);
            const listBase64 = btoa(unescape(encodeURIComponent(listJson)));

            await pushFileToGitHub(
              githubToken,
              'public/uploads.json',
              listBase64,
              `sync: register ${file.name} in uploads catalog`
            );
          } else {
            console.warn('Failed uploading BGM file to GitHub:', mediaResult.error);
          }
        } catch (gitErr) {
          console.error('Failed pushing files to GitHub:', gitErr);
        }
      } else if (import.meta.env.DEV) {
        try {
          const res = await fetch('/api/upload-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, base64 })
          });
          const result = await res.json();
          if (result.success) {
            newTrack.url = result.url;
          }
        } catch (uploadErr) {
          console.warn('Failed to upload BGM file to local server, using local IndexedDB only:', uploadErr);
        }
      }

      const updatedCustom = [...customTracks, newTrack];
      onUpdateTracks(updatedCustom);
      setSelectedTrackId(trackId);
    } catch (err) {
      setUploadError('Failed storing local music file in system.');
    } finally {
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
