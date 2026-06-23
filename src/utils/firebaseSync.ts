import { ref, set, get, push, query, orderByChild, limitToLast } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { db, storage } from '../firebase';
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

// ─── Media Uploads (Firebase Storage) ────────────────────────────────

/**
 * Upload an audio file to Firebase Storage and return the download URL.
 */
export async function uploadMediaToFirebase(
  filename: string,
  fileBlob: Blob
): Promise<string> {
  const fileRef = storageRef(storage, `uploads/${filename}`);
  await uploadBytes(fileRef, fileBlob);
  const downloadURL = await getDownloadURL(fileRef);
  return downloadURL;
}

/**
 * Get the download URL for a file already in Firebase Storage.
 */
export async function getMediaURL(filename: string): Promise<string | null> {
  try {
    const fileRef = storageRef(storage, `uploads/${filename}`);
    return await getDownloadURL(fileRef);
  } catch (e) {
    console.warn(`Could not get download URL for ${filename}:`, e);
    return null;
  }
}

// ─── Uploads Catalog (Realtime Database) ─────────────────────────────

/**
 * Register a filename in the uploads catalog stored in Realtime Database.
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
