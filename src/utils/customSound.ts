import { SFXSound } from '../types';
import { getAudioFile } from './audioDb';

export const getCustomSoundBlob = async (sound: SFXSound): Promise<Blob | null> => {
  if (sound.url) {
    try {
      const baseUrl = import.meta.env.BASE_URL;
      const cleanUrl = sound.url.startsWith('/') ? sound.url : `${baseUrl}${sound.url}`;
      const response = await fetch(cleanUrl);
      if (response.ok) {
        return await response.blob();
      }
    } catch (e) {
      console.warn(`Failed to fetch sound from URL ${sound.url}, falling back to IndexedDB:`, e);
    }
  }
  if (sound.customFileId) {
    return await getAudioFile(sound.customFileId);
  }
  return null;
};
