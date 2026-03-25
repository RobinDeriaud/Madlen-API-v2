"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useDataList } from "@/lib/hooks/use-data-list"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AudioFileItem = {
  id: number
  name: string
  url: string
  mime: string | null
  size: number | null
  ext: string | null
  createdAt: string
  updatedAt: string
  exercice: { id: number; numero: number | null; nom: string | null } | null
}

type SortKey = "name" | "ext" | "size" | "exercice" | "createdAt"
type SortDir = "asc" | "desc"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function exerciceLabel(ex: AudioFileItem["exercice"]): string {
  if (!ex) return "—"
  return `${ex.numero ?? "?"} — ${ex.nom ?? "Sans nom"}`
}

function sortValue(item: AudioFileItem, key: SortKey): string | number {
  switch (key) {
    case "name": return item.name ?? ""
    case "ext": return item.ext ?? ""
    case "size": return item.size ?? 0
    case "exercice": return exerciceLabel(item.exercice)
    case "createdAt": return item.createdAt ?? ""
  }
}

function sorted(list: AudioFileItem[], key: SortKey, dir: SortDir): AudioFileItem[] {
  return [...list].sort((a, b) => {
    const av = sortValue(a, key)
    const bv = sortValue(b, key)
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "fr", { sensitivity: "base" })
    return dir === "asc" ? cmp : -cmp
  })
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-gray-700">{dir === "asc" ? "↑" : "↓"}</span>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AudioFilesPage() {
  const { data: audioFiles, loading, error, refetch } = useDataList<AudioFileItem>("/api/audio-files")

  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [search, setSearch] = useState("")

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replacingId, setReplacingId] = useState<number | null>(null)

  // Inline rename
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  // Audio player
  const [playingId, setPlayingId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Refetch on focus
  useEffect(() => {
    const onFocus = () => refetch()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refetch])

  // ------ Sort ------
  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  // ------ Upload ------
  async function handleUpload(files: FileList | File[]) {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setUploading(true)
    setUploadError(null)
    const formData = new FormData()
    for (const f of fileArray) formData.append("files", f)

    try {
      const res = await fetch("/api/audio-files", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? "Erreur lors de l'import")
      } else {
        setUploadError(null)
        refetch()
      }
    } catch (err) {
      console.error("[audio upload]", err)
      setUploadError("Erreur réseau")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ------ Replace ------
  async function handleReplace(files: FileList | null) {
    if (!files || files.length === 0 || !replacingId) return
    const formData = new FormData()
    formData.append("file", files[0])

    try {
      const res = await fetch(`/api/audio-files/${replacingId}/replace`, {
        method: "POST",
        body: formData,
      })
      if (res.ok) refetch()
      else {
        const data = await res.json()
        setUploadError(data.error ?? "Erreur lors du remplacement")
      }
    } catch {
      setUploadError("Erreur réseau")
    } finally {
      setReplacingId(null)
      if (replaceInputRef.current) replaceInputRef.current.value = ""
    }
  }

  // ------ Rename ------
  async function handleRename(id: number) {
    const trimmed = editName.trim()
    if (!trimmed) { setEditingId(null); return }
    await fetch(`/api/audio-files/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    setEditingId(null)
    refetch()
  }

  // ------ Selection ------
  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.id)))
  }

  // ------ Delete ------
  async function handleDelete(item: AudioFileItem) {
    if (!window.confirm(`Supprimer « ${item.name}${item.ext ?? ""} » ?`)) return
    await fetch(`/api/audio-files/${item.id}`, { method: "DELETE" })
    if (playingId === item.id) setPlayingId(null)
    setSelected(prev => { const next = new Set(prev); next.delete(item.id); return next })
    refetch()
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!window.confirm(`Supprimer ${selected.size} fichier${selected.size > 1 ? "s" : ""} ?`)) return
    setDeleting(true)
    for (const id of selected) {
      await fetch(`/api/audio-files/${id}`, { method: "DELETE" })
    }
    if (playingId && selected.has(playingId)) setPlayingId(null)
    setSelected(new Set())
    setDeleting(false)
    refetch()
  }

  // ------ Play ------
  function togglePlay(item: AudioFileItem) {
    if (playingId === item.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      setPlayingId(item.id)
    }
  }

  // ------ Filter & sort ------
  const filtered = audioFiles.filter((f) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      f.name.toLowerCase().includes(q) ||
      (f.ext ?? "").toLowerCase().includes(q) ||
      exerciceLabel(f.exercice).toLowerCase().includes(q)
    )
  })
  const rows = sorted(filtered, sortKey, sortDir)

  // ------ Trigger file picker ------
  function openFilePicker() {
    fileInputRef.current?.click()
  }

  return (
    <div>
      {/* File inputs — always mounted, visually hidden via sr-only */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.webm,.aac,.m4a,.flac,.mp4"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) {
            handleUpload(files)
          }
          // Reset so re-selecting the same file still triggers onChange
          e.target.value = ""
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.webm,.aac,.m4a,.flac,.mp4"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          handleReplace(e.target.files)
          e.target.value = ""
        }}
      />

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fichiers audio</h1>
        <button
          onClick={openFilePicker}
          disabled={uploading || loading}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {uploading ? "Import en cours…" : "+ Importer"}
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Chargement…</div>}
      {error && <div className="flex items-center justify-center py-20 text-red-500 text-sm">{error}</div>}

      {!loading && !error && <>
      {/* Zone drag & drop + sélection exercice */}
      <div className="mb-5 flex flex-col gap-3">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleUpload(e.dataTransfer.files)
          }}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-sm text-gray-500">
            {uploading
              ? "Import en cours…"
              : "Glissez vos fichiers audio ici ou cliquez pour parcourir"}
          </p>
          <p className="text-xs text-gray-400 mt-1">MP3, WAV, OGG, AAC, FLAC — max 20 Mo par fichier</p>
        </div>

        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <p className="text-red-600 text-sm">{uploadError}</p>
          </div>
        )}
      </div>

      {/* Recherche */}
      <div className="mb-5">
        <input
          type="search"
          placeholder="Rechercher par nom, extension ou exercice…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          {rows.length} fichier{rows.length !== 1 ? "s" : ""}
          {search.trim() ? ` sur ${audioFiles.length}` : ""}
        </p>
      </div>

      {/* Barre d'actions groupées */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-4 py-2">
          <span className="text-sm text-gray-700 font-medium">
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {deleting ? "Suppression…" : "Supprimer la sélection"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Désélectionner
          </button>
        </div>
      )}

      {/* Tableau */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th className="text-center py-3 px-2 w-8">
              <input
                type="checkbox"
                checked={rows.length > 0 && selected.size === rows.length}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-gray-800 focus:ring-gray-400"
              />
            </th>
            <th className="text-center py-3 px-2 font-semibold w-10 text-gray-500">
              {/* play */}
            </th>
            <th
              className={`text-left py-3 pr-6 font-semibold cursor-pointer select-none transition-colors ${sortKey === "name" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("name")}
            >
              Nom
              <SortIcon active={sortKey === "name"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-6 font-semibold w-20 cursor-pointer select-none transition-colors ${sortKey === "ext" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("ext")}
            >
              Ext
              <SortIcon active={sortKey === "ext"} dir={sortDir} />
            </th>
            <th
              className={`text-right py-3 pr-6 font-semibold w-24 cursor-pointer select-none transition-colors ${sortKey === "size" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("size")}
            >
              Taille
              <SortIcon active={sortKey === "size"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-6 font-semibold cursor-pointer select-none transition-colors ${sortKey === "exercice" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("exercice")}
            >
              Exercice
              <SortIcon active={sortKey === "exercice"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-6 font-semibold w-28 cursor-pointer select-none transition-colors ${sortKey === "createdAt" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("createdAt")}
            >
              Date
              <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
            </th>
            <th className="text-center py-3 font-semibold w-32 text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors group ${selected.has(item.id) ? "bg-blue-50/50" : ""}`}>
              {/* Checkbox */}
              <td className="py-3 px-2 text-center">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="rounded border-gray-300 text-gray-800 focus:ring-gray-400"
                />
              </td>
              {/* Play button */}
              <td className="py-3 px-2 text-center">
                <button
                  onClick={() => togglePlay(item)}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  title={playingId === item.id ? "Pause" : "Écouter"}
                >
                  {playingId === item.id ? "⏸" : "▶"}
                </button>
              </td>

              {/* Name (inline editable) */}
              <td className="py-3 pr-6">
                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(item.id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-full"
                  />
                ) : (
                  <button
                    onClick={() => { setEditingId(item.id); setEditName(item.name) }}
                    className="text-gray-800 hover:underline underline-offset-2 text-left"
                    title="Cliquer pour renommer"
                  >
                    {item.name}
                  </button>
                )}
              </td>

              <td className="py-3 pr-6 text-gray-500 text-xs font-mono">{item.ext ?? "—"}</td>
              <td className="py-3 pr-6 text-right text-gray-500 text-xs tabular-nums">{formatSize(item.size)}</td>
              <td className="py-3 pr-6 text-gray-600 text-xs">{exerciceLabel(item.exercice)}</td>
              <td className="py-3 pr-6 text-gray-400 text-xs tabular-nums">{formatDate(item.createdAt)}</td>

              {/* Actions */}
              <td className="py-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setReplacingId(item.id)
                      replaceInputRef.current?.click()
                    }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Remplacer le fichier"
                  >
                    Remplacer
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer"
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-8">
          {search.trim() ? `Aucun résultat pour « ${search.trim()} »` : "Aucun fichier audio."}
        </p>
      )}

      {/* Audio element (hidden, controlled) */}
      {playingId && (
        <audio
          ref={audioRef}
          src={`/api/audio-files/${playingId}/stream`}
          autoPlay
          onEnded={() => setPlayingId(null)}
          onError={() => setPlayingId(null)}
          className="hidden"
        />
      )}
      </>}
    </div>
  )
}
