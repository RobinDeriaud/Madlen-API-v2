import path from "path"
import { mkdir, unlink, writeFile, readFile } from "fs/promises"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_DIR = path.join(process.cwd(), "storage", "audio")

export const ALLOWED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/mp4",
  "audio/flac",
  "audio/x-m4a",
  "audio/x-flac",
]

/** 20 MB */
export const MAX_AUDIO_FILE_SIZE = 20 * 1024 * 1024

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

export function audioFilePath(id: number, ext: string): string {
  const e = ext.startsWith(".") ? ext : `.${ext}`
  return path.join(STORAGE_DIR, `${id}${e}`)
}

export function audioStreamUrl(id: number): string {
  return `/api/audio-files/${id}/stream`
}

// ---------------------------------------------------------------------------
// Disk operations
// ---------------------------------------------------------------------------

async function ensureStorageDir(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true })
}

export async function saveAudioFile(
  id: number,
  ext: string,
  buffer: Buffer,
): Promise<string> {
  await ensureStorageDir()
  const filePath = audioFilePath(id, ext)
  await writeFile(filePath, buffer)
  return filePath
}

export async function deleteAudioFile(
  id: number,
  ext: string,
): Promise<void> {
  try {
    await unlink(audioFilePath(id, ext))
  } catch {
    // file may not exist — ignore
  }
}

export async function readAudioFile(
  id: number,
  ext: string,
): Promise<Buffer> {
  return readFile(audioFilePath(id, ext))
}
