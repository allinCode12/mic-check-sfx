import { SFXSound } from '../types';
import { getAudioFile, saveAudioFile } from './audioDb';
import { getMediaFromDatabase } from './firebaseSync';

export const getCustomSoundBlob = async (sound: SFXSound): Promise<Blob | null> => {
  // 1. Try local IndexedDB first (fastest)
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
