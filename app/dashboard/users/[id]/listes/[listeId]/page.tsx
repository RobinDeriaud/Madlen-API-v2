"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { MacroBadge } from "@/lib/macro"

type ExerciceOption = {
  id: number
  numero: number | null
  nom: string | null
  macro: string | null
}

type ListeData = {
  id: number
  nom: string | null
  date: string | null
  isActive: boolean
  exercices: ExerciceOption[]
}

const inputCls =
  "border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

export default function EditListePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const listeId = params.listeId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [nom, setNom] = useState("")
  const [date, setDate] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const [exercices, setExercices] = useState<ExerciceOption[]>([])
  const [loadingEx, setLoadingEx] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${userId}/listes/${listeId}`).then((r) => {
        if (!r.ok) throw new Error("Liste introuvable")
        return r.json() as Promise<ListeData>
      }),
      fetch("/api/exercices").then((r) => r.ok ? r.json() as Promise<ExerciceOption[]> : []),
    ])
      .then(([liste, allExercices]) => {
        setNom(liste.nom ?? "")
        setDate(liste.date ? liste.date.slice(0, 10) : "")
        setIsActive(liste.isActive)
        setSelected(new Set(liste.exercices.map((e) => e.id)))
        setExercices((allExercices as ExerciceOption[]).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)))
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false)
        setLoadingEx(false)
      })
  }, [userId, listeId])

  function toggleExercice(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
    setSaveError(null)
  }

  const filtered = exercices.filter((ex) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      String(ex.numero ?? "").includes(q) ||
      (ex.nom ?? "").toLowerCase().includes(q)
    )
  })

  // Selected exercises sorted by numero for the preview
  const selectedExercices = exercices
    .filter((ex) => selected.has(ex.id))
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setSaveError(null)

    const res = await fetch(`/api/users/${userId}/listes/${listeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom || null,
        date: date || null,
        isActive,
        exerciceIds: Array.from(selected),
      }),
    })

    if (res.ok) {
      setSaved(true)
    } else {
      const data = await res.json()
      setSaveError(data.error ?? "Erreur lors de la sauvegarde.")
    }
    setSaving(false)
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/users" className="text-gray-400 hover:text-gray-700 text-sm">
          ← Utilisateurs
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          href={`/dashboard/users/${userId}?tab=suivi`}
          className="text-gray-400 hover:text-gray-700 text-sm"
        >
          Utilisateur #{userId}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800">
          {nom || `Liste #${listeId}`}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom de la liste">
            <input
              type="text"
              className={inputCls}
              value={nom}
              onChange={(e) => { setNom(e.target.value); setSaved(false); setSaveError(null) }}
              placeholder="Ex : Semaine 1"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => { setDate(e.target.value); setSaved(false); setSaveError(null) }}
            />
          </Field>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => { setIsActive(e.target.checked); setSaved(false); setSaveError(null) }}
              className="w-4 h-4 rounded border-gray-300 text-gray-800 focus:ring-gray-300"
            />
            <span className="text-sm text-gray-700">Liste active</span>
          </label>
        </div>

        {/* Exercise picker + preview side by side */}
        <div className="grid grid-cols-2 gap-4 items-start">

          {/* Left: picker */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Exercices
              </h2>
              <span className="text-xs text-gray-400">{exercices.length} disponibles</span>
            </div>
            <input
              type="text"
              className={inputCls}
              placeholder="Filtrer par numéro ou nom…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {loadingEx ? (
              <p className="text-sm text-gray-400 py-2">Chargement…</p>
            ) : (
              <div className="border border-gray-200 rounded overflow-y-auto max-h-[28rem]">
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 px-3 py-4">Aucun exercice trouvé.</p>
                ) : (
                  filtered.map((ex) => {
                    const isSelected = selected.has(ex.id)
                    return (
                      <label
                        key={ex.id}
                        className={[
                          "flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0 transition-colors",
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleExercice(ex.id)}
                          className="w-4 h-4 rounded border-gray-300 text-gray-800 focus:ring-gray-300 shrink-0"
                        />
                        <span className="text-xs text-gray-400 w-8 shrink-0 text-right font-mono">
                          {ex.numero ?? "—"}
                        </span>
                        <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                          {ex.nom ?? <span className="text-gray-300">Sans nom</span>}
                        </span>
                        {ex.macro && <MacroBadge macro={ex.macro} />}
                      </label>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Right: selection preview */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Liste en cours
              </h2>
              <span className="text-xs text-gray-500 font-medium">
                {selected.size} exercice{selected.size !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="border border-gray-200 rounded overflow-y-auto max-h-[28rem] min-h-16 bg-gray-50">
              {selectedExercices.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-4 text-center">
                  Aucun exercice sélectionné
                </p>
              ) : (
                selectedExercices.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 group"
                  >
                    <span className="text-xs text-gray-300 w-5 shrink-0 text-right">{idx + 1}.</span>
                    <span className="text-xs text-gray-400 w-8 shrink-0 text-right font-mono">
                      {ex.numero ?? "—"}
                    </span>
                    <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                      {ex.nom ?? <span className="text-gray-400">Sans nom</span>}
                    </span>
                    {ex.macro && <MacroBadge macro={ex.macro} />}
                    <button
                      type="button"
                      onClick={() => toggleExercice(ex.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 text-base leading-none"
                      title="Retirer"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/users/${userId}?tab=suivi`)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Retour
          </button>
          {saved && <span className="text-green-600 text-sm">Sauvegardé.</span>}
          {saveError && <span className="text-red-500 text-sm">{saveError}</span>}
        </div>
      </form>
    </div>
  )
}
