import React, { useState, useRef } from 'react';
import { SFXSound } from '../types';
import { PlusCircle, UploadCloud, Radio, Sparkles, FileAudio, Keyboard, AlertCircle, RefreshCw } from 'lucide-react';
import { saveAudioFile } from '../utils/audioDb';
import { audioEngine } from '../utils/audioEngine';

interface SoundCreatorProps {
  onAddSound: (sound: SFXSound) => void;
  existingSounds: SFXSound[];
}

const colorPresets: SFXSound['color'][] = ['cyan', 'magenta', 'green', 'yellow', 'rose', 'amber', 'blue', 'purple'];

const synthPresets = [
  { type: 'portal', label: 'Portal Whoosh 🌀', desc: 'Resonant sweeping sci-fi gateway whoosh' },
  { type: 'laser', label: 'Retro Laser ⚡', desc: 'Exponential fast pitch decay blaster shot' },
  { type: 'alarm', label: 'AI Alarm 🚨', desc: 'High frequency double pulsing emergency siren' },
  { type: 'shatter', label: 'Digital Shatter 💎', desc: 'Metallic high-pass noise glass break' },
  { type: 'subdrop', label: 'Sub Drop 🔈', desc: 'Deep sub-harmonic resonance bass swell' },
  { type: 'buzz', label: 'Buzzer ⚠️', desc: 'Detuned dual sawtooth retro warning buzz' },
  { type: 'hum', label: 'Engine Hum 🛸', desc: 'Infinite low frequency active power core drone' },
  { type: 'spark', label: 'Static Spark ⚡', desc: 'Rapid electrostatic clicks and discharges' },
];

export default function SoundCreator({ onAddSound, existingSounds }: SoundCreatorProps) {
  const [sourceType, setSourceType] = useState<'synth' | 'upload'>('synth');
  const [soundName, setSoundName] = useState<string>('');
  
  // Synth states
  const [synthType, setSynthType] = useState<SFXSound['synthType']>('portal');
  
  // Custom upload states
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Design config states
  const [selectedColor, setSelectedColor] = useState<SFXSound['color']>('cyan');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.75);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Auto-find next available numeric shortcut key
  const getNextAvailableShortcut = (): string => {
    const usedKeys = existingSounds.map((s) => s.keyShortcut).filter((k) => !!k);
    for (let k = 1; k <= 9; k++) {
      if (!usedKeys.includes(k.toString())) {
        return k.toString();
      }
    }
    return '';
  };

  // Pre-load next available shortcut on state toggles
  React.useEffect(() => {
    setSelectedKey(getNextAvailableShortcut());
  }, [existingSounds]);

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

  const processSelectedFile = (file: File) => {
    setUploadError('');
    setIsUploading(true);

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/aac', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && !file.name.endsWith('.ogg')) {
      setUploadError('Invalid format. Please import an MP3, WAV, or OGG file.');
      setIsUploading(false);
      return;
    }

    // Read file as Blob
    setFileBlob(file);
    setFileName(file.name);
    // Autofill title if blank
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setSoundName(cleanName);
    setIsUploading(false);
  };

  const handleCreateSound = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalName = soundName.trim() || (sourceType === 'synth' ? synthPresets.find(p => p.type === synthType)?.label || 'Sci-Fi Sound' : fileName || 'Uploaded Audio');
    const soundId = `snd_${Date.now()}`;
    const nextOrder = existingSounds.length ? Math.max(...existingSounds.map(s => s.order)) + 1 : 0;

    let payload: SFXSound = {
      id: soundId,
      name: finalName,
      color: selectedColor,
      keyShortcut: selectedKey,
      isLooping: isLooping,
      volume: volume,
      isCustom: false,
      playCount: 0,
      order: nextOrder,
    };

    if (sourceType === 'synth') {
      payload.isCustom = false;
      payload.synthType = synthType;
    } else {
      if (!fileBlob) {
        setUploadError('Please select or drag an audio file first.');
        return;
      }
      
      try {
        setIsUploading(true);
        // Save the raw file blob into IndexedDB
        await saveAudioFile(soundId, fileBlob);
        
        // Let's decode and cache instantly inside the AudioEngine to prevent trigger delays
        await audioEngine.cacheFile(soundId, fileBlob);

        payload.isCustom = true;
        payload.customFileId = soundId;
      } catch (err: any) {
        console.error(err);
        setUploadError('Failed storing local file in IndexedDB.');
        setIsUploading(false);
        return;
      }
    }

    onAddSound(payload);

    // Reset Creation states
    setSoundName('');
    setFileBlob(null);
    setFileName('');
    setIsUploading(false);
    setSelectedColor(colorPresets[existingSounds.length % colorPresets.length]);
    setSelectedKey(getNextAvailableShortcut());
  };

  return (
    <div id="sound-creator-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Sparkles size={18} className="text-cyan-400" />
        <h2 className="text-sm font-bold tracking-wider font-mono text-white uppercase">ADD NEW SOUND TRIGGER</h2>
      </div>

      {/* Mode Switches */}
      <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-950 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setSourceType('synth');
            setSoundName('');
          }}
          className={`py-1.5 text-xs font-mono font-bold uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${
            sourceType === 'synth'
              ? 'bg-slate-800 text-cyan-400 font-bold border border-cyan-500/15'
              : 'text-slate-500 hover:text-slate-350 bg-transparent'
          }`}
        >
          <Radio size={13} />
          Procedural Synth
        </button>
        <button
          type="button"
          onClick={() => {
            setSourceType('upload');
            setSoundName('');
          }}
          className={`py-1.5 text-xs font-mono font-bold uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${
            sourceType === 'upload'
              ? 'bg-slate-800 text-cyan-400 font-bold border border-cyan-500/15'
              : 'text-slate-500 hover:text-slate-350 bg-transparent'
          }`}
        >
          <UploadCloud size={13} />
          Upload Sound File
        </button>
      </div>

      <form onSubmit={handleCreateSound} className="space-y-4">
        {sourceType === 'synth' ? (
          /* Synth Config Group */
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">
              Select Synthesized SFX Base
            </label>
            <div className="grid grid-cols-2 gap-2">
              {synthPresets.map((preset) => (
                <button
                  type="button"
                  key={preset.type}
                  onClick={() => {
                    setSynthType(preset.type as any);
                    setSoundName(preset.label.replace(/[\d\w\s]+$/, '').trim());
                    // Assign loop configuration intelligently
                    if (preset.type === 'hum' || preset.type === 'alarm') {
                      setIsLooping(true);
                    } else {
                      setIsLooping(false);
                    }
                  }}
                  className={`p-2 rounded-lg border text-left transition text-xs flex flex-col justify-between ${
                    synthType === preset.type
                      ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                  }`}
                  style={{ minHeight: '64px' }}
                >
                  <span className="font-semibold">{preset.label}</span>
                  <span className="text-[9px] text-slate-500 font-mono scale-95 origin-left tracking-tighter mt-0.5 truncate w-full">
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* File Upload Group */
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">
              Source file (.mp3, .wav, .ogg)
            </label>

            <div
              ref={dragRef}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-500 bg-cyan-950/10'
                  : fileBlob
                  ? 'border-emerald-500/60 bg-emerald-950/5'
                  : 'border-slate-800 bg-slate-950 hover:bg-slate-950/80 hover:border-slate-700'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept="audio/*"
                className="hidden"
              />

              {fileBlob ? (
                <div className="flex flex-col items-center gap-1.5">
                  <FileAudio size={28} className="text-emerald-400 animate-bounce" />
                  <span className="text-xs font-semibold text-white truncate max-w-[200px]">{fileName}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {(fileBlob.size / (1024 * 1024)).toFixed(2)} MB - Click to change
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <UploadCloud size={28} className="text-slate-500" />
                  <span className="text-xs text-slate-300 mt-1">Drag file here or <span className="text-cyan-400 font-semibold underline">browse</span></span>
                  <span className="text-[10px] font-mono text-slate-500">Supports WAV, MP3, OGG up to 25MB</span>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/20 border border-rose-950 p-2 rounded mt-2">
                <AlertCircle size={12} />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Custom trigger Name field */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
            Display Label Name
          </label>
          <input
            type="text"
            value={soundName}
            onChange={(e) => setSoundName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder={sourceType === 'synth' ? 'Custom Sound Label' : 'e.g. Explosion'}
          />
        </div>

        {/* Configurations grid (Volume sliders, colors, shortcuts) */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-850">
          <div>
            <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1">CHOOSE NEON THEME</span>
            <div className="flex flex-wrap gap-1.5">
              {colorPresets.map((c) => {
                const colorHex = {
                  cyan: 'bg-cyan-500',
                  magenta: 'bg-fuchsia-500',
                  green: 'bg-emerald-500',
                  yellow: 'bg-yellow-400',
                  rose: 'bg-rose-500',
                  amber: 'bg-amber-500',
                  blue: 'bg-blue-500',
                  purple: 'bg-violet-500',
                }[c];

                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-6 h-6 rounded-full ${colorHex} cursor-pointer transition border-2 ${
                      selectedColor === c ? 'border-white scale-110 shadow-md ring-1 ring-cyan-500/30' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    title={c}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1">SHORTCUT MAPPING</span>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-2 py-1 w-full text-xs font-mono focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">No Shortcut</option>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r', 't'].map((key) => {
                const isTaken = existingSounds.some((s) => s.keyShortcut === key);
                return (
                  <option key={key} value={key}>
                    Key {key.toUpperCase()} {isTaken ? '(TAKEN)' : '(Free)'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-2 pt-2 border-t border-slate-900/60 items-center">
            {/* Loop switch */}
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white select-none">
              <input
                type="checkbox"
                checked={isLooping}
                onChange={(e) => setIsLooping(e.target.checked)}
                className="rounded border-slate-850 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 w-4 h-4"
              />
              <span className="text-xs font-mono">AUTOLOOP REPEAT</span>
            </label>

            {/* Volume feedback */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500">VOL</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 accent-cyan-400 bg-slate-900 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-mono text-cyan-400 min-w-[20px]">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Launch Trigger */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs rounded-lg uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-95 disabled:opacity-40"
        >
          {isUploading ? (
            <>
              <RefreshCw className="animate-spin" size={14} />
              Saving Audio Assets...
            </>
          ) : (
            <>
              <PlusCircle size={15} />
              Build SFX Pad Cell
            </>
          )}
        </button>
      </form>
    </div>
  );
}
