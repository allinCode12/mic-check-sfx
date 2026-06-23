export interface SFXSound {
  id: string;
  name: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'green' | 'rose' | 'amber' | 'blue' | 'purple';
  keyShortcut: string; // "1" - "9", "0", or ""
  isLooping: boolean;
  volume: number; // 0.0 to 1.0
  isCustom: boolean; // uploaded by user via file input
  customFileId?: string; // key in IndexedDB for file data
  synthType?: 'portal' | 'laser' | 'alarm' | 'shatter' | 'subdrop' | 'buzz' | 'hum' | 'spark'; // synthesis parameters
  playCount: number;
  order: number;
}

export interface ScriptLine {
  id: number;
  character?: string; // e.g., "NARRATOR", "ZEPHYR", "SYSOP", or undefined for action text
  text: string;
  sfxCue?: string; // Parsed string if line contains an SFX cue, e.g., "Portal Whoosh"
  bgmCue?: string; // Parsed string if line contains a BGM cue, e.g., "Ambient Cosmic Drone"
}

export type ThemeType = 'cyberpunk' | 'matrix' | 'sunset' | 'vaporwave';

export interface RadioPlayScript {
  title: string;
  author: string;
  lines: ScriptLine[];
}
