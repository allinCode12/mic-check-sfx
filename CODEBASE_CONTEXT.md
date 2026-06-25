# Mic Check SFX Codebase Context

Read this first when working on the app. It is a compact map for Codex, Copilot, and other coding agents so they do not need to rediscover the whole project.

## What This App Is

Mic Check SFX is a Vite + React + TypeScript web app for live radio-play sound effects. It has:

- A script panel with active line tracking and clickable `[SFX: ...]` / `[BGM: ...]` cues.
- A soundboard of procedural synth pads and uploaded audio pads.
- A background music controller.
- Firebase Realtime Database cloud sync for settings, history, uploads catalog, and uploaded media stored as base64.
- Browser IndexedDB caching for local uploaded audio playback.

The app is mostly client-side. `vite.config.ts` also contains a dev-only middleware plugin for local file/history endpoints, but the current app path primarily uses Firebase sync.

## Entry Points

- `src/main.tsx`: React root. Imports `App` and `index.css`.
- `src/App.tsx`: Main state owner and coordinator. Holds script, sounds, BGM tracks, history, uploads list, active line, master volume, mute state, mode toggles, and cloud save/load actions.
- `src/index.css`: Global styles and Tailwind import/custom classes.
- `vite.config.ts`: Vite config, Tailwind/React plugins, `base: '/mic-check-sfx/'`, and dev middleware for `/api/save-history` and `/api/upload-file`.

## Main Data Types

Defined in `src/types.ts`:

- `SFXSound`: One soundboard pad. Can be procedural (`synthType`) or uploaded (`isCustom`, `customFileId`, `url`).
- `BGMTrack`: One background music track. Custom tracks use `customFileId` and optional `url`.
- `RadioPlayScript`: Script title, author, and ordered `ScriptLine[]`.
- `ScriptLine`: Text plus optional parsed `sfxCue` and `bgmCue`.
- `HistoryEntry`: Snapshot of script, sounds, and optional BGM tracks.

## Component Map

- `src/components/ScriptPanel.tsx`
  - Displays and edits the radio play script.
  - Parses raw script lines into `ScriptLine` objects.
  - Detects `[SFX: cue]` and `[BGM: cue]` patterns.
  - Calls `onTriggerSFXCue(cueName)` and `onTriggerBGMCue(cueName)` when cue badges are clicked.

- `src/components/SFXPad.tsx`
  - Renders one soundboard pad.
  - Practice mode shows editing controls: name, color, shortcut, volume, loop, delete, reorder, test play.
  - Live mode shows large trigger UI and next-cue controls.
  - Does not own audio logic; receives callbacks from `App`.

- `src/components/SoundCreator.tsx`
  - Creates new procedural or uploaded SFX pads.
  - Uploaded audio is saved to IndexedDB through `saveAudioFile`.
  - Uploaded audio is also uploaded to Firebase RTDB through `uploadMediaToDatabase`.
  - The created pad gets `customFileId = soundId`; if Firebase upload succeeds, `url` is a data URL.

- `src/components/BGMController.tsx`
  - Plays/stops/pauses procedural ambient BGM or uploaded BGM tracks.
  - Custom BGM is saved to IndexedDB and uploaded to Firebase RTDB.
  - Uses `audioEngine` for playback.

- `src/components/HistoryPanel.tsx`
  - Shows saved history snapshots and uploaded filenames.
  - Restores snapshots through `onLoadVersion`.
  - Adds uploaded files to the SFX deck through `onAddSoundFromFile`.
  - Preview playback currently builds `BASE_URL + 'uploads/' + filename`, which matches the old static upload path, not Firebase RTDB.

- `src/components/MasterVisualizer.tsx`
  - Visualizes audio using `audioEngine.getAnalyser()`.

- `src/components/GitHubSettingsModal.tsx`
  - GitHub token/settings UI if used.

## Utility Map

- `src/utils/audioEngine.ts`
  - Singleton `audioEngine`.
  - Owns Web Audio context, master gain, analyser, active sound voices, decoded buffer cache, and BGM state.
  - Plays uploaded files with decoded `AudioBuffer`; falls back to `HTMLAudioElement` if decode fails.
  - Plays procedural synth sounds through `playSynthesizedSound`.
  - Important methods: `init`, `setMasterVolume`, `cacheFile`, `playFile`, `playSynth`, `stopSound`, `stopAll`, `playBGM`, `playProceduralBGM`, `pauseBGM`, `resumeBGM`, `getBGMDetails`.

- `src/utils/synth.ts`
  - Procedural Web Audio synth implementations for `laser`, `portal`, `alarm`, `shatter`, `subdrop`, `buzz`, `hum`, and `spark`.

- `src/utils/audioDb.ts`
  - IndexedDB wrapper.
  - DB name: `MicCheckSFX_AudioDB`.
  - Object store: `audio_files`.
  - Used for local uploaded audio blobs.

- `src/utils/customSound.ts`
  - Resolves a custom SFX blob.
  - Lookup order: IndexedDB by `customFileId`, `data:` URL from `sound.url`, then Firebase RTDB by a guessed filename from `sound.name`.

- `src/utils/firebaseSync.ts`
  - Firebase RTDB sync layer.
  - Settings path: `settings/current`.
  - History path: `history/{entry.id}`.
  - Media path: `media/{sanitizeKey(filename)}`.
  - Upload catalog path: `settings/uploads`.
  - Stores uploaded audio as base64 in RTDB and returns a `data:` URL.

- `src/utils/githubSync.ts`
  - Direct GitHub Contents API helper for repo `allinCode12/mic-check-sfx`.
  - Can test a token, get file SHA, push a file, and fetch raw file content.

- `src/utils/defaultScript.ts`
  - Initial script content.

## App State And Data Flow

`App.tsx` owns the important state:

- `sounds`: SFX pads. Initialized from `localStorage.micchecksfx_sounds`, otherwise preset sounds.
- `script`: Current radio play. Initialized from `localStorage.micchecksfx_script`, otherwise `DEFAULT_RADIO_PLAY`.
- `bgmTracks`: Custom BGM tracks. Initialized from `localStorage.micchecksfx_bgm_tracks`.
- `historyList`: Cloud history snapshots.
- `uploadsList`: Firebase upload catalog filenames.
- `activeLineId`: Current script line.
- `nextCueId`: The sound pad marked as the next cue.
- `masterVolume` / `isMuted`: Master audio controls.

On mount, `App` calls `loadCloudData()`:

1. `loadSettingsFromFirebase()` can replace local sounds/script/BGM tracks.
2. `loadHistoryFromFirebase()` fills history.
3. `loadUploadsCatalog()` fills uploaded filenames.

Local persistence:

- Sounds, script, and BGM tracks are written to `localStorage`.
- `data:` URLs are stripped before saving to localStorage to avoid quota issues.
- Uploaded audio blobs are cached in IndexedDB.

Cloud save:

- `handleSaveToCloud()` calls `saveSettingsToFirebase(sounds, script, bgmTracks)`.
- Then creates a `HistoryEntry` and calls `saveHistoryEntry(newEntry)`.
- Local history is capped at 50 entries; Firebase history loading also returns at most 50 after sorting.

## Audio Playback Flow

SFX:

1. User triggers a pad by click, keyboard shortcut, or script cue.
2. `App.triggerPlaySound(sound)` increments play count.
3. If `sound.isCustom`, `getCustomSoundBlob(sound)` loads the blob, then `audioEngine.playFile(...)` plays it.
4. If procedural, `audioEngine.playSynth(...)` calls `playSynthesizedSound(...)`.

BGM:

1. `BGMController` or script `[BGM: ...]` cue chooses a track.
2. Procedural "cosmic/drone/synth/ambient" cues call `audioEngine.playProceduralBGM(...)`.
3. Custom tracks load from IndexedDB, Firebase/data URL fallback, then `audioEngine.playBGM(...)`.

Keyboard shortcuts:

- Number/letter shortcuts trigger matching SFX pads.
- `Space` plays the marked next cue and advances the script.
- `Enter` / `ArrowDown` advances the script.
- `ArrowUp` goes to previous line.
- `Escape` stops all audio.
- `m` toggles mute.
- Key handling skips inputs, textareas, and contenteditable elements.

## Firebase Notes

`src/firebase.ts` currently hard-codes Firebase client config for project `sfxsoundboard`. `.env.example` only documents Gemini/APP_URL and does not describe Firebase env vars.

Firebase client config is not a private secret by itself, but writes and reads are only safe if RTDB security rules are configured correctly in Firebase. Review database rules before deploying publicly.

RTDB paths in use:

- `settings/current`
- `settings/uploads`
- `history/{id}`
- `media/{sanitizeKey(filename)}`

Uploaded media is base64 encoded into Realtime Database. This is convenient but can be expensive and slow for large audio files. Firebase Storage is a better long-term fit for media blobs.

## Known Gotchas / Review Notes

- Custom uploaded SFX recovery can fail across devices if the `data:` URL was stripped and the original filename is not available. `uploadMediaToDatabase(fileName, fileBlob)` stores media by original filename, but `customSound.ts` later guesses `sound.name.replace(/\s/g, '_')`. If the display name differs from the file name, RTDB lookup misses. Prefer storing `originalFilename` or `mediaKey` on `SFXSound` and `BGMTrack`.

- `handleAddSoundFromFile(filename)` sets `customFileId` to a new generated sound ID and caches the blob locally, but only stores `payload.url = URL.createObjectURL(blob)`. Object URLs are session-only and are not useful after reload. Store a stable filename/media key too.

- `HistoryPanel` preview uses `BASE_URL/uploads/{filename}`. Firebase-uploaded files are stored in RTDB, not in `public/uploads`, so preview may fail unless files also exist under static uploads.

- BGM recovery also guesses filenames from display names in `BGMController`. The upload key is the original file name, while the track name is cleaned and decorated for display. Store a stable media key.

- `loadSettingsFromFirebase()` is typed as returning `RadioPlayScript`, but returns `script: data.script || null`. This is tolerated by loose inference at runtime but does not match the declared non-null type exactly.

- The cloud save button uses `JSON.stringify` comparisons against the latest history entry to detect unsaved changes. This works but can be noisy if object property order or transient fields change.

- The dev middleware in `vite.config.ts` supports local `/api/save-history` and `/api/upload-file`, but current UI code appears to rely on Firebase instead. Treat the middleware as legacy/dev-only unless wiring it back in.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Type check: `npm run lint` (`tsc --noEmit`)
- Production build: `npm run build`

Last known local check:

- `npm run lint` passed.
- `npm run build` could not be completed in the sandbox because esbuild child process spawn was blocked with `EPERM`; rerun normally in a local shell to verify.

## When Making Changes

- Keep `App.tsx` as the state coordinator unless extracting a real shared concern.
- Use `audioEngine` for all playback behavior.
- Use `audioDb.ts` for local audio blob persistence.
- Use `firebaseSync.ts` for cloud sync, but avoid adding more base64 media storage unless that is explicitly desired.
- If fixing upload portability, add stable media identity to `SFXSound` / `BGMTrack` and migrate retrieval code to use it.
- Be careful with Web Audio user-gesture requirements. `audioEngine.init()` is usually called from user-triggered flows.
- Preserve `base: '/mic-check-sfx/'` unless changing deployment target.
