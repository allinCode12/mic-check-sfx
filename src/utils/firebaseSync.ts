import { ref, set, get } from 'firebase/database';
import { db } from '../firebase';
import { SFXSound, RadioPlayScript, BGMTrack, HistoryEntry } from '../types';

// ─── Settings (Realtime Database) ────────────────────────────────────

/**
 * Save all current settings to Firebase Realtime Database.
 */
export async function saveSettingsToFirebase(
  sounds: SFXSound[],
  script: RadioPlayScript,
  bgmTracks: BGMTrack[]
): Promise<void> {
  const settingsRef = ref(db, 'settings/current');
  await set(settingsRef, { sounds, script, bgmTracks });
}

/**
 * Load current settings from Firebase Realtime Database.
 */
export async function loadSettingsFromFirebase(): Promise<{
  sounds: SFXSound[];
  script: RadioPlayScript;
  bgmTracks: BGMTrack[];
} | null> {
  const settingsRef = ref(db, 'settings/current');
  const snapshot = await get(settingsRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return {
      sounds: data.sounds || [],
      script: data.script || null,
      bgmTracks: data.bgmTracks || [],
    };
  }
  return null;
}

// ─── History (Realtime Database) ─────────────────────────────────────

/**
 * Save a new history entry to Firebase.
 */
export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  const historyRef = ref(db, `history/${entry.id}`);
  await set(historyRef, entry);
}

/**
 * Load all history entries from Firebase, sorted by timestamp (newest first), capped at 50.
 */
export async function loadHistoryFromFirebase(): Promise<HistoryEntry[]> {
  const historyRef = ref(db, 'history');
  const snapshot = await get(historyRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const entries: HistoryEntry[] = Object.values(data);
    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return entries.slice(0, 50);
  }
  return [];
}

// ─── Media Uploads (Realtime Database as base64) ─────────────────────

/**
 * Upload an audio file to Firebase Realtime Database as a base64 string.
 * Returns a data URL that can be used to play the audio directly.
 */
export async function uploadMediaToDatabase(
  filename: string,
  fileBlob: Blob
): Promise<string> {
  const base64 = await blobToBase64(fileBlob);
  const mediaRef = ref(db, `media/${sanitizeKey(filename)}`);
  await set(mediaRef, {
    filename,
    mimeType: fileBlob.type || 'audio/mpeg',
    base64,
    uploadedAt: new Date().toISOString(),
    size: fileBlob.size
  });
  // Register in catalog
  await registerUploadInCatalog(filename);
  // Return a data URL for immediate playback
  return `data:${fileBlob.type || 'audio/mpeg'};base64,${base64}`;
}

/**
 * Get an audio file from Firebase Realtime Database. Returns a Blob, or null.
 */
export async function getMediaFromDatabase(filename: string): Promise<Blob | null> {
  try {
    const mediaRef = ref(db, `media/${sanitizeKey(filename)}`);
    const snapshot = await get(mediaRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return base64ToBlob(data.base64, data.mimeType || 'audio/mpeg');
    }
    return null;
  } catch (e) {
    console.warn(`Could not get media "${filename}" from database:`, e);
    return null;
  }
}

/**
 * Get the download URL (data: URL) for a file in Firebase RTDB.
 */
export async function getMediaURL(filename: string): Promise<string | null> {
  try {
    const mediaRef = ref(db, `media/${sanitizeKey(filename)}`);
    const snapshot = await get(mediaRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return `data:${data.mimeType || 'audio/mpeg'};base64,${data.base64}`;
    }
    return null;
  } catch (e) {
    console.warn(`Could not get media URL for "${filename}":`, e);
    return null;
  }
}

// ─── Uploads Catalog (Realtime Database) ─────────────────────────────

/**
 * Register a filename in the uploads catalog.
 */
export async function registerUploadInCatalog(filename: string): Promise<void> {
  const catalogRef = ref(db, 'settings/uploads');
  const snapshot = await get(catalogRef);
  let files: string[] = [];
  if (snapshot.exists()) {
    const data = snapshot.val();
    files = Array.isArray(data.files) ? data.files : [];
  }
  if (!files.includes(filename)) {
    files.push(filename);
  }
  await set(catalogRef, { files });
}

/**
 * Load the uploads catalog (list of uploaded filenames).
 */
export async function loadUploadsCatalog(): Promise<string[]> {
  const catalogRef = ref(db, 'settings/uploads');
  const snapshot = await get(catalogRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Array.isArray(data.files) ? data.files : [];
  }
  return [];
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Convert a Blob to a base64 string (without the data: prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:<mime>;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Convert a base64 string to a Blob. */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mimeType });
}

/** Sanitize a filename for use as a Firebase RTDB key (no . # $ [ ] /) */
function sanitizeKey(filename: string): string {
  return filename.replace(/[.#$\[\]\/]/g, '_');
}
