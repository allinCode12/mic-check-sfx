import { SFXSound } from '../types';
import { getAudioFile, saveAudioFile } from './audioDb';
import { getMediaFromDatabase } from './firebaseSync';
import { resolveFileFromFolder } from './localFolder';

/**
 * Resolve the audio blob for a custom (non-synth) sound.
 *
 * Resolution order:
 *   0. Local folder (if `localPath` is set and a directory handle is provided)
 *   1. IndexedDB (fastest local cache)
 *   2. data: URL from Firebase settings
 *   3. Firebase RTDB media store (cross-device fallback)
 */
export const getCustomSoundBlob = async (
  sound: SFXSound,
  folderHandle?: FileSystemDirectoryHandle | null
): Promise<Blob | null> => {
  // 0. Try local folder first (zero-copy, fastest for local files)
  if (sound.localPath && folderHandle) {
    try {
      const file = await resolveFileFromFolder(folderHandle, sound.localPath);
      if (file) {
        // Also cache into IndexedDB for offline resilience
        if (sound.customFileId) {
          saveAudioFile(sound.customFileId, file).catch(() => {});
        }
        return file;
      }
    } catch (e) {
      console.warn(`Local folder resolve failed for "${sound.localPath}":`, e);
    }
  }

  // 1. Try local IndexedDB (fastest cached source)
  if (sound.customFileId) {
    const localBlob = await getAudioFile(sound.customFileId);
    if (localBlob) return localBlob;
  }

  // 2. Try data: URL (base64 from Firebase RTDB settings)
  if (sound.url && sound.url.startsWith('data:')) {
    try {
      const response = await fetch(sound.url);
      if (response.ok) {
        const blob = await response.blob();
        // Cache locally for next time
        if (sound.customFileId) {
          await saveAudioFile(sound.customFileId, blob);
        }
        return blob;
      }
    } catch (e) {
      console.warn('Failed to decode data URL:', e);
    }
  }

  // 3. Try Firebase RTDB media store (cross-device fallback)
  if (sound.url || sound.customFileId) {
    try {
      // Try to find the file by its original name in Firebase RTDB
      const filename = sound.name.replace(/\s/g, '_');
      const rtdbBlob = await getMediaFromDatabase(filename);
      if (rtdbBlob) {
        // Cache locally for next time
        if (sound.customFileId) {
          await saveAudioFile(sound.customFileId, rtdbBlob);
        }
        return rtdbBlob;
      }
    } catch (e) {
      console.warn('Failed to fetch from Firebase RTDB:', e);
    }
  }

  return null;
};

