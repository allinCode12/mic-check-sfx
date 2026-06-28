/**
 * Local Folder Audio Loader
 *
 * Uses the File System Access API (Chromium only) to let the user pick a
 * local directory containing audio files. The directory handle is persisted
 * in IndexedDB so the app remembers the linked folder across sessions.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface LocalAudioFile {
  /** Relative path within the linked folder, e.g. "sfx/explosion.mp3" */
  relativePath: string;
  /** Just the filename portion, e.g. "explosion.mp3" */
  name: string;
  /** The underlying file handle – used to read the blob on demand */
  handle: FileSystemFileHandle;
}

// ─── Constants ───────────────────────────────────────────────────────

const HANDLE_STORE = 'folder_handles';
const HANDLE_KEY = 'audio_folder';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm']);

// ─── IndexedDB helpers for directory handle persistence ──────────────

const FOLDER_DB_NAME = 'MicCheckSFX_FolderDB';
const FOLDER_DB_VERSION = 1;

function openFolderDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FOLDER_DB_NAME, FOLDER_DB_VERSION);
    request.onerror = () => reject(new Error('Failed to open folder handle DB'));
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
  });
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Returns true when the File System Access API is available in this browser.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Open the native OS directory picker and return a directory handle.
 */
export async function pickLocalFolder(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser.');
  }
  // @ts-ignore – TypeScript may not include showDirectoryPicker yet
  const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
    mode: 'read',
  });
  return handle;
}

/**
 * Save a directory handle into IndexedDB so we can restore it later.
 */
export async function persistFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openFolderDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([HANDLE_STORE], 'readwrite');
    const store = tx.objectStore(HANDLE_STORE);
    const request = store.put(handle, HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve the previously-persisted directory handle from IndexedDB.
 * Returns `null` if none was saved.
 */
export async function getPersistedFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openFolderDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([HANDLE_STORE], 'readonly');
      const store = tx.objectStore(HANDLE_STORE);
      const request = store.get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Remove the persisted folder handle (unlink).
 */
export async function clearPersistedFolderHandle(): Promise<void> {
  try {
    const db = await openFolderDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([HANDLE_STORE], 'readwrite');
      const store = tx.objectStore(HANDLE_STORE);
      const request = store.delete(HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Request (or re-request) read permission on a directory handle.
 * Returns `true` if permission is granted, `false` otherwise.
 */
export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  requestIfNeeded = true
): Promise<boolean> {
  const opts = { mode: 'read' as const };

  // @ts-ignore – queryPermission / requestPermission may not be typed
  if ((await handle.queryPermission(opts)) === 'granted') {
    return true;
  }

  if (requestIfNeeded) {
    // @ts-ignore
    return (await handle.requestPermission(opts)) === 'granted';
  }

  return false;
}

/**
 * Recursively scan a directory for audio files.
 * Returns a flat list of `LocalAudioFile` entries.
 */
export async function scanForAudioFiles(
  dirHandle: FileSystemDirectoryHandle,
  basePath = ''
): Promise<LocalAudioFile[]> {
  const results: LocalAudioFile[] = [];

  // @ts-ignore – async iterator on directory handle
  for await (const [name, entryHandle] of dirHandle.entries()) {
    if (entryHandle.kind === 'file') {
      const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
      if (AUDIO_EXTENSIONS.has(ext)) {
        const relativePath = basePath ? `${basePath}/${name}` : name;
        results.push({
          relativePath,
          name,
          handle: entryHandle as FileSystemFileHandle,
        });
      }
    } else if (entryHandle.kind === 'directory') {
      const subPath = basePath ? `${basePath}/${name}` : name;
      const subResults = await scanForAudioFiles(
        entryHandle as FileSystemDirectoryHandle,
        subPath
      );
      results.push(...subResults);
    }
  }

  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return results;
}

/**
 * Read a File (Blob) from a file handle. Use this for playback.
 */
export async function getFileBlob(fileHandle: FileSystemFileHandle): Promise<File> {
  return fileHandle.getFile();
}

/**
 * Given a persisted directory handle and a relative path, resolve the
 * file handle by walking the path segments. Returns the File blob or null.
 */
export async function resolveFileFromFolder(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string
): Promise<File | null> {
  try {
    const segments = relativePath.split('/');
    const fileName = segments.pop()!;

    let currentDir = dirHandle;
    for (const seg of segments) {
      currentDir = await currentDir.getDirectoryHandle(seg);
    }

    const fileHandle = await currentDir.getFileHandle(fileName);
    return fileHandle.getFile();
  } catch (e) {
    console.warn(`Could not resolve local file "${relativePath}":`, e);
    return null;
  }
}
