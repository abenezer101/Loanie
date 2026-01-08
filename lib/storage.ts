import type { Recording } from "./types"

const RECORDINGS_KEY = "loanie_recordings"

export function getRecordings(): Recording[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(RECORDINGS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveRecording(recording: Recording): void {
  const recordings = getRecordings()
  recordings.unshift(recording)
  localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recordings))
}

export function deleteRecording(id: string): void {
  const recordings = getRecordings()
  const filtered = recordings.filter((r) => r.id !== id)
  localStorage.setItem(RECORDINGS_KEY, JSON.stringify(filtered))
}

export function getRecording(id: string): Recording | undefined {
  const recordings = getRecordings()
  return recordings.find((r) => r.id === id)
}

export function updateRecording(id: string, updates: Partial<Recording>): void {
  const recordings = getRecordings()
  const index = recordings.findIndex((r) => r.id === id)
  if (index !== -1) {
    recordings[index] = { ...recordings[index], ...updates }
    localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recordings))
  }
}
