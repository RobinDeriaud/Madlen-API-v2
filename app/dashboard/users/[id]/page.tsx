"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, Suspense } from "react"
import { MACRO_CONFIG, MacroBadge } from "@/lib/macro"

// ─── Types ───────────────────────────────────────────────────────────────────

type UserType = "NONE" | "PATIENT" | "PRATICIEN"
type Sexe = "FEMININ" | "MASCULIN"

type PatientSummary = {
  id: number
  age: number | null
  sexe: Sexe | null
  user: {
    id: number
    nom: string | null
    prenom: string | null
    email: string
    confirmed: boolean
  } | null
}

type PatientSearchResult = {
  id: number
  nom: string | null
  prenom: string | null
  email: string
  confirmed: boolean
  profil_patient: { id: number; praticienId: number | null } | null
}

type ExerciceOption = {
  id: number
  numero: number | null
  nom: string | null
  macro: string | null
}

type Liste = {
  id: number
  nom: string | null
  date: string | null
  isActive: boolean
  createdAt: string
  exercices: ExerciceOption[]
}

type UserData = {
  id: number
  email: string
  nom: string | null
  prenom: string | null
  confirmed: boolean
  user_type: UserType
  profil_patient: {
    id: number
    age: number | null
    sexe: Sexe | null
    praticien: {
      id: number
      user: { id: number; nom: string | null; prenom: string | null; email: string } | null
    } | null
  } | null
  profil_praticien: {
    id: number
    numero_adeli: string | null
    patients: PatientSummary[]
  } | null
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  "border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-4 pb-1 border-b border-gray-100">
      {children}
    </h2>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-gray-800 focus:ring-gray-300"
      />
      {label}
    </label>
  )
}

function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex border-b border-gray-200 mb-6 gap-0">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={[
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === tab.key
              ? "border-gray-800 text-gray-800"
              : "border-transparent text-gray-500 hover:text-gray-700",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Nouvelle liste modal ─────────────────────────────────────────────────────

function NouvelleListeModal({ userId, onClose, onCreated }: {
  userId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [nom, setNom] = useState("")
  const [date, setDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [exercices, setExercices] = useState<ExerciceOption[]>([])
  const [loadingEx, setLoadingEx] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10))
    fetch("/api/exercices")
      .then((r) => r.ok ? r.json() : [])
      .then((data: ExerciceOption[]) =>
        setExercices(data.sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)))
      )
      .catch(() => setExercices([]))
      .finally(() => setLoadingEx(false))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  function toggleExercice(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = exercices.filter((ex) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return String(ex.numero ?? "").includes(q) || (ex.nom ?? "").toLowerCase().includes(q)
  })

  const selectedExercices = exercices
    .filter((ex) => selected.has(ex.id))
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const res = await fetch(`/api/users/${userId}/listes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nom || null, date: date || null, exerciceIds: Array.from(selected) }),
    })
    if (res.ok) {
      onCreated()
      onClose()
    } else {
      const data = await res.json()
      setSaveError(data.error ?? "Erreur lors de la création.")
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">Nouvelle liste</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nom de la liste</label>
              <input
                type="text"
                className={inputCls}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex : Semaine 1"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</label>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {/* Picker + preview */}
          <div className="grid grid-cols-2 gap-4 items-start">
            {/* Left: picker */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Exercices</span>
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
                <div className="border border-gray-200 rounded overflow-y-auto max-h-72">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-gray-400 px-3 py-4">Aucun exercice trouvé.</p>
                  ) : filtered.map((ex) => {
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
                        <span className="text-xs text-gray-400 w-8 shrink-0 text-right font-mono">{ex.numero ?? "—"}</span>
                        <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                          {ex.nom ?? <span className="text-gray-300">Sans nom</span>}
                        </span>
                        {ex.macro && <MacroBadge macro={ex.macro} />}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right: selection preview */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Sélection</span>
                <span className="text-xs text-gray-500 font-medium">
                  {selected.size} exercice{selected.size !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="border border-gray-200 rounded overflow-y-auto max-h-72 min-h-12 bg-gray-50">
                {selectedExercices.length === 0 ? (
                  <p className="text-sm text-gray-400 px-3 py-4 text-center">Aucun exercice sélectionné</p>
                ) : selectedExercices.map((ex, idx) => (
                  <div key={ex.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 group">
                    <span className="text-xs text-gray-300 w-5 shrink-0 text-right">{idx + 1}.</span>
                    <span className="text-xs text-gray-400 w-8 shrink-0 text-right font-mono">{ex.numero ?? "—"}</span>
                    <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                      {ex.nom ?? <span className="text-gray-400">Sans nom</span>}
                    </span>
                    {ex.macro && <MacroBadge macro={ex.macro} />}
                    <button
                      type="button"
                      onClick={() => toggleExercice(ex.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 text-base leading-none"
                      title="Retirer"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "Création…" : "Créer la liste"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Annuler
            </button>
            {saveError && <span className="text-red-500 text-sm">{saveError}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit liste modal ────────────────────────────────────────────────────────

function EditListeModal({ userId, listeId, onClose, onSaved }: {
  userId: string
  listeId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nom, setNom] = useState("")
  const [date, setDate] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [exercices, setExercices] = useState<ExerciceOption[]>([])
  const [loadingEx, setLoadingEx] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${userId}/listes/${listeId}`).then((r) => {
        if (!r.ok) throw new Error("Liste introuvable")
        return r.json()
      }),
      fetch("/api/exercices").then((r) => r.ok ? r.json() : []),
    ])
      .then(([liste, allExercices]: [{ nom: string | null; date: string | null; isActive: boolean; exercices: ExerciceOption[] }, ExerciceOption[]]) => {
        setNom(liste.nom ?? "")
        setDate(liste.date ? liste.date.slice(0, 10) : "")
        setIsActive(liste.isActive)
        setSelected(new Set(liste.exercices.map((e) => e.id)))
        setExercices((allExercices as ExerciceOption[]).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)))
      })
      .catch((e) => setError(e.message))
      .finally(() => { setLoading(false); setLoadingEx(false) })
  }, [userId, listeId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

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
    return String(ex.numero ?? "").includes(q) || (ex.nom ?? "").toLowerCase().includes(q)
  })

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
      body: JSON.stringify({ nom: nom || null, date: date || null, isActive, exerciceIds: Array.from(selected) }),
    })
    if (res.ok) {
      setSaved(true)
      onSaved()
    } else {
      const data = await res.json()
      setSaveError(data.error ?? "Erreur lors de la sauvegarde.")
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">
            {nom || `Liste #${listeId}`}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <p className="text-gray-500 px-6 py-8">Chargement…</p>
        ) : error ? (
          <p className="text-red-500 px-6 py-8">{error}</p>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nom de la liste</label>
                <input
                  type="text"
                  className={inputCls}
                  value={nom}
                  onChange={(e) => { setNom(e.target.value); setSaved(false); setSaveError(null) }}
                  placeholder="Ex : Semaine 1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setSaved(false); setSaveError(null) }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => { setIsActive(e.target.checked); setSaved(false); setSaveError(null) }}
                className="w-4 h-4 rounded border-gray-300 text-gray-800 focus:ring-gray-300"
              />
              <span className="text-gray-700">Liste active</span>
            </label>

            {/* Picker + preview */}
            <div className="grid grid-cols-2 gap-4 items-start">
              {/* Left: picker */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Exercices</span>
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
                  <div className="border border-gray-200 rounded overflow-y-auto max-h-72">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-gray-400 px-3 py-4">Aucun exercice trouvé.</p>
                    ) : filtered.map((ex) => {
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
                          <span className="text-xs text-gray-400 w-8 shrink-0 text-right font-mono">{ex.numero ?? "—"}</span>
                          <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                            {ex.nom ?? <span className="text-gray-300">Sans nom</span>}
                          </span>
                          {ex.macro && <MacroBadge macro={ex.macro} />}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right: selection preview */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Sélection</span>
                  <span className="text-xs text-gray-500 font-medium">
                    {selected.size} exercice{selected.size !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="border border-gray-200 rounded overflow-y-auto max-h-72 min-h-12 bg-gray-50">
                  {selectedExercices.length === 0 ? (
                    <p className="text-sm text-gray-400 px-3 py-4 text-center">Aucun exercice sélectionné</p>
                  ) : selectedExercices.map((ex, idx) => (
                    <div key={ex.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 group">
                      <span className="text-xs text-gray-300 w-5 shrink-0 text-right">{idx + 1}.</span>
                      <span className="text-xs text-gray-400 w-8 shrink-0 text-right font-mono">{ex.numero ?? "—"}</span>
                      <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                        {ex.nom ?? <span className="text-gray-400">Sans nom</span>}
                      </span>
                      {ex.macro && <MacroBadge macro={ex.macro} />}
                      <button
                        type="button"
                        onClick={() => toggleExercice(ex.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0 text-base leading-none"
                        title="Retirer"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Fermer
              </button>
              {saved && <span className="text-green-600 text-sm">Sauvegardé.</span>}
              {saveError && <span className="text-red-500 text-sm">{saveError}</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ displayName, onClose, onConfirm, deleting }: {
  displayName: string
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !deleting) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, deleting])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={() => !deleting && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-gray-800">Supprimer l&apos;utilisateur</h2>
        <p className="text-sm text-gray-600">
          Vous êtes sur le point de supprimer définitivement{" "}
          <strong className="text-gray-900">{displayName}</strong>.
          Cette action supprimera également son profil et ses listes d&apos;exercices.
        </p>
        <p className="text-sm font-semibold text-red-600">Cette action est irréversible.</p>
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Suppression…" : "Supprimer définitivement"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm Activate Liste Modal ────────────────────────────────────────────

function ConfirmActivateListeModal({ listeNom, onClose, onConfirm, activating }: {
  listeNom: string | null
  onClose: () => void
  onConfirm: () => void
  activating: boolean
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !activating) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, activating])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={() => !activating && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-gray-800">Activer cette liste ?</h2>
        <p className="text-sm text-gray-600">
          La liste <strong className="text-gray-900">{listeNom ?? "Sans nom"}</strong> deviendra
          la liste active. Toutes les autres listes de ce patient seront désactivées.
        </p>
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onConfirm}
            disabled={activating}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {activating ? "Activation…" : "Activer"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={activating}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm Delete Liste Modal ───────────────────────────────────────────────

function ConfirmDeleteListeModal({ listeNom, onClose, onConfirm, deleting }: {
  listeNom: string | null
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !deleting) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, deleting])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={() => !deleting && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-gray-800">Supprimer la liste</h2>
        <p className="text-sm text-gray-600">
          Vous êtes sur le point de supprimer définitivement la liste{" "}
          <strong className="text-gray-900">{listeNom ?? "Sans nom"}</strong>.
        </p>
        <p className="text-sm font-semibold text-red-600">Cette action est irréversible.</p>
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Inner Page (uses useSearchParams) ───────────────────────────────────────

function UserEditInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [f, setF] = useState({
    email: "",
    nom: "",
    prenom: "",
    confirmed: false,
    user_type: "NONE" as UserType,
  })

  const [pat, setPat] = useState({
    age: "",
    sexe: "" as Sexe | "",
  })

  const [pra, setPra] = useState({
    numero_adeli: "",
  })

  type AssignedPraticien = { userId: number; nom: string | null; prenom: string | null; email: string }
  const [assignedPraticien, setAssignedPraticien] = useState<AssignedPraticien | null>(null)

  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [hasPraticienProfile, setHasPraticienProfile] = useState(false)
  const [removing, setRemoving] = useState<Set<number>>(new Set())

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const [listes, setListes] = useState<Liste[]>([])
  const [listesLoading, setListesLoading] = useState(false)
  const [showNewListe, setShowNewListe] = useState(false)
  const [editingListeId, setEditingListeId] = useState<number | null>(null)
  const [activatingListeId, setActivatingListeId] = useState<number | null>(null)
  const [confirmingActivate, setConfirmingActivate] = useState<{ id: number; nom: string | null } | null>(null)
  const [confirmingDeleteListe, setConfirmingDeleteListe] = useState<{ id: number; nom: string | null } | null>(null)
  const [deletingListeId, setDeletingListeId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Determine initial tab from searchParams
  const defaultTab = searchParams.get("tab") ?? "general"
  const [activeTab, setActiveTab] = useState(defaultTab)

  function reloadListes() {
    setListesLoading(true)
    fetch(`/api/users/${id}/listes`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: Liste[]) => setListes(data))
      .catch(() => setListes([]))
      .finally(() => setListesLoading(false))
  }

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Introuvable")
        return r.json()
      })
      .then((data: UserData) => {
        setF({
          email: data.email ?? "",
          nom: data.nom ?? "",
          prenom: data.prenom ?? "",
          confirmed: data.confirmed,
          user_type: data.user_type,
        })
        if (data.profil_patient) {
          setPat({
            age: data.profil_patient.age != null ? String(data.profil_patient.age) : "",
            sexe: data.profil_patient.sexe ?? "",
          })
          if (data.profil_patient.praticien?.user) {
            const u = data.profil_patient.praticien.user
            setAssignedPraticien({ userId: u.id, nom: u.nom, prenom: u.prenom, email: u.email })
          }
        }
        if (data.profil_praticien) {
          setPra({ numero_adeli: data.profil_praticien.numero_adeli ?? "" })
          setPatients(data.profil_praticien.patients ?? [])
          setHasPraticienProfile(true)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // Load listes when switching to suivi tab
  useEffect(() => {
    if (activeTab !== "suivi") return
    reloadListes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id])

  function setField<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    setSaveError(null)
  }

  function setPat_(key: keyof typeof pat) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setPat((prev) => ({ ...prev, [key]: e.target.value }))
      setSaved(false)
      setSaveError(null)
    }
  }

  function setPra_(key: keyof typeof pra) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setPra((prev) => ({ ...prev, [key]: e.target.value }))
      setSaved(false)
      setSaveError(null)
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  function handleSearchChange(q: string) {
    setSearchQuery(q)
    setAddError(null)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!q.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/users?type=PATIENT&q=${encodeURIComponent(q)}`)
        if (!r.ok) return
        const data: PatientSearchResult[] = await r.json()
        const existingUserIds = new Set(patients.map((p) => p.user?.id).filter(Boolean))
        setSearchResults(data.filter((u) => !existingUserIds.has(u.id)))
        setShowDropdown(true)
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  async function handleAddPatient(result: PatientSearchResult) {
    setAddError(null)
    const res = await fetch(`/api/users/${id}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userPatientId: result.id }),
    })
    if (!res.ok) {
      const data = await res.json()
      setAddError(data.error ?? "Erreur lors de l'ajout.")
      return
    }
    const { patientId } = await res.json()
    setPatients((prev) => [
      ...prev,
      {
        id: patientId,
        age: null,
        sexe: null,
        user: { id: result.id, nom: result.nom, prenom: result.prenom, email: result.email, confirmed: result.confirmed },
      },
    ])
    setSearchQuery("")
    setSearchResults([])
    setShowDropdown(false)
  }

  async function handleRemovePatient(patientId: number) {
    setRemoving((prev) => new Set(prev).add(patientId))
    try {
      const res = await fetch(`/api/users/${id}/patients`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      })
      if (res.ok) {
        setPatients((prev) => prev.filter((p) => p.id !== patientId))
      }
    } finally {
      setRemoving((prev) => { const s = new Set(prev); s.delete(patientId); return s })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)

    const body: Record<string, unknown> = {
      email: f.email || undefined,
      nom: f.nom || null,
      prenom: f.prenom || null,
      confirmed: f.confirmed,
      user_type: f.user_type,
    }

    if (f.user_type === "PATIENT") {
      body.profil_patient = {
        age: pat.age !== "" ? parseInt(pat.age) : null,
        sexe: pat.sexe || null,
      }
    }

    if (f.user_type === "PRATICIEN") {
      body.profil_praticien = {
        numero_adeli: pra.numero_adeli || null,
      }
    }

    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setSaved(true)
    } else {
      const data = await res.json()
      setSaveError(data.error ?? "Erreur lors de la sauvegarde.")
    }
    setSaving(false)
  }

  async function handleActivateListe() {
    if (!confirmingActivate || activatingListeId !== null) return
    const listeId = confirmingActivate.id
    setActivatingListeId(listeId)
    try {
      const res = await fetch(`/api/users/${id}/listes/${listeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      })
      if (res.ok) {
        setListes((prev) => prev.map((l) => ({ ...l, isActive: l.id === listeId })))
        setConfirmingActivate(null)
      }
    } finally {
      setActivatingListeId(null)
    }
  }

  async function handleDeleteListe() {
    if (!confirmingDeleteListe || deletingListeId !== null) return
    const listeId = confirmingDeleteListe.id
    setDeletingListeId(listeId)
    try {
      const res = await fetch(`/api/users/${id}/listes/${listeId}`, { method: "DELETE" })
      if (res.ok) {
        setListes((prev) => prev.filter((l) => l.id !== listeId))
        setConfirmingDeleteListe(null)
      }
    } finally {
      setDeletingListeId(null)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard/users")
    } else {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>
  if (error) return <p className="text-red-500">{error}</p>

  const displayName = [f.prenom, f.nom].filter(Boolean).join(" ") || f.email || `Utilisateur #${id}`

  // Build tabs based on user type (uses current f.user_type)
  const tabs = [{ key: "general", label: "Général" }]
  if (f.user_type === "PRATICIEN") tabs.push({ key: "patients", label: "Patients" })
  if (f.user_type === "PATIENT") tabs.push({ key: "suivi", label: "Suivi patient" })

  // Ensure active tab is valid for current user_type
  const validTab = tabs.some((t) => t.key === activeTab) ? activeTab : "general"

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/users" className="text-gray-400 hover:text-gray-700 text-sm">
            ← Utilisateurs
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-800">{displayName}</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
        >
          Supprimer
        </button>
      </div>

      {searchParams.get("emailSent") === "1" && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          Un e-mail de confirmation a été envoyé à <strong>{f.email}</strong>.
        </div>
      )}

      <TabBar tabs={tabs} active={validTab} onChange={setActiveTab} />

      {/* ── Onglet Général ── */}
      {validTab === "general" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SectionTitle>Identité</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom">
              <input
                type="text"
                className={inputCls}
                value={f.prenom}
                onChange={(e) => setField("prenom", e.target.value)}
              />
            </Field>
            <Field label="Nom">
              <input
                type="text"
                className={inputCls}
                value={f.nom}
                onChange={(e) => setField("nom", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={f.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-2 pt-1">
            <Checkbox
              label="Mail confirmé"
              checked={f.confirmed}
              onChange={(v) => setField("confirmed", v)}
            />
          </div>

          <SectionTitle>Compte</SectionTitle>
          <Field label="Type">
            <select
              className={inputCls}
              value={f.user_type}
              onChange={(e) => setField("user_type", e.target.value as UserType)}
            >
              <option value="NONE">Aucun</option>
              <option value="PATIENT">Patient</option>
              <option value="PRATICIEN">Praticien</option>
            </select>
          </Field>

          {f.user_type === "PATIENT" && (
            <>
              <SectionTitle>Profil patient</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Âge">
                  <input
                    type="number"
                    className={inputCls}
                    value={pat.age}
                    onChange={setPat_("age")}
                    min={0}
                    max={150}
                  />
                </Field>
                <Field label="Sexe">
                  <select className={inputCls} value={pat.sexe} onChange={setPat_("sexe")}>
                    <option value="">— aucun —</option>
                    <option value="FEMININ">Féminin</option>
                    <option value="MASCULIN">Masculin</option>
                  </select>
                </Field>
              </div>
            </>
          )}

          {f.user_type === "PRATICIEN" && (
            <>
              <SectionTitle>Profil praticien</SectionTitle>
              <Field label="Numéro ADELI">
                <input
                  type="text"
                  className={inputCls}
                  value={pra.numero_adeli}
                  onChange={setPra_("numero_adeli")}
                />
              </Field>
            </>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/users")}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Annuler
            </button>
            {saved && <span className="text-green-600 text-sm">Sauvegardé.</span>}
            {saveError && <span className="text-red-500 text-sm">{saveError}</span>}
          </div>
        </form>
      )}

      {/* ── Onglet Patients (praticien) ── */}
      {validTab === "patients" && (
        <div className="flex flex-col gap-4">
          <SectionTitle>Patients ({patients.length})</SectionTitle>

          {!hasPraticienProfile ? (
            <p className="text-sm text-amber-600">
              Enregistrez d&apos;abord le profil dans l&apos;onglet Général pour gérer les patients.
            </p>
          ) : (
            <>
              {patients.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun patient associé.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-200">
                      <th className="text-left py-2 pl-3 pr-4 font-semibold text-gray-500 w-36">Nom</th>
                      <th className="text-left py-2 pr-4 font-semibold text-gray-500 w-36">Prénom</th>
                      <th className="text-left py-2 pr-4 font-semibold text-gray-500">Email</th>
                      <th className="py-2 pr-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
                      >
                        <td
                          className="py-2 pl-3 pr-4 text-gray-800 font-medium cursor-pointer"
                          onClick={() => p.user && router.push(`/dashboard/users/${p.user.id}`)}
                        >
                          {p.user?.nom ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td
                          className="py-2 pr-4 text-gray-700 cursor-pointer"
                          onClick={() => p.user && router.push(`/dashboard/users/${p.user.id}`)}
                        >
                          {p.user?.prenom ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td
                          className="py-2 pr-4 text-gray-600 cursor-pointer"
                          onClick={() => p.user && router.push(`/dashboard/users/${p.user.id}`)}
                        >
                          {p.user?.email ?? "—"}
                        </td>

                        <td className="py-2 pr-3 text-right">
                          <button
                            type="button"
                            disabled={removing.has(p.id)}
                            onClick={() => handleRemovePatient(p.id)}
                            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                          >
                            {removing.has(p.id) ? "…" : "Retirer"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div ref={searchContainerRef} className="relative mt-3">
                <input
                  type="text"
                  placeholder="Rechercher un patient à ajouter…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  className={inputCls}
                />
                {searching && (
                  <p className="text-xs text-gray-400 mt-1">Recherche…</p>
                )}
                {!searching && searchQuery.trim() && !showDropdown && searchResults.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Aucun patient trouvé.</p>
                )}
                {addError && (
                  <p className="text-xs text-red-500 mt-1">{addError}</p>
                )}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleAddPatient(r)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between gap-2 text-sm border-b border-gray-100 last:border-0"
                      >
                        <span>
                          <span className="font-medium text-gray-800">
                            {[r.prenom, r.nom].filter(Boolean).join(" ") || r.email}
                          </span>
                          <span className="text-gray-400 ml-2 text-xs">{r.email}</span>
                        </span>
                        {r.profil_patient?.praticienId != null && (
                          <span className="text-xs text-amber-500 shrink-0">Déjà assigné</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Onglet Suivi patient ── */}
      {validTab === "suivi" && (
        <div className="flex flex-col gap-4">
          <SectionTitle>Praticien référent</SectionTitle>
          {assignedPraticien ? (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/users/${assignedPraticien.userId}`)}
              className="text-left text-sm text-gray-800 hover:underline underline-offset-2 w-fit"
            >
              {[assignedPraticien.prenom, assignedPraticien.nom].filter(Boolean).join(" ") || assignedPraticien.email}
              <span className="text-gray-400 ml-2 text-xs">{assignedPraticien.email}</span>
            </button>
          ) : (
            <span className="text-sm text-gray-400">Aucun praticien assigné</span>
          )}

          <div className="flex items-center justify-between pt-2">
            <SectionTitle>Listes</SectionTitle>
            <button
              type="button"
              onClick={() => setShowNewListe(true)}
              className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              + Nouvelle liste
            </button>
          </div>

          {listesLoading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : listes.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune liste pour ce patient.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="text-left py-2 pl-3 pr-4 font-semibold text-gray-500">Nom</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-500 w-32">Date</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-500 w-20">Exercices</th>
                  <th className="py-2 pr-4 w-10" />
                  <th className="py-2 pr-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {listes.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pl-3 pr-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-gray-800 font-medium">
                          {l.nom ?? <span className="text-gray-300">Sans nom</span>}
                        </span>
                        {l.exercices.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {l.exercices.slice().sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)).map((ex) => {
                              const cfg = ex.macro ? MACRO_CONFIG[ex.macro] : null
                              return (
                                <span
                                  key={ex.id}
                                  title={ex.nom ?? undefined}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border"
                                  style={cfg
                                    ? { backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }
                                    : { backgroundColor: "#f3f4f6", borderColor: "#d1d5db", color: "#6b7280" }
                                  }
                                >
                                  {ex.numero ?? "—"}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-gray-600 align-top">
                      {l.date
                        ? new Date(l.date).toLocaleDateString("fr-FR")
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2 pr-4 text-gray-600 align-top">{l.exercices.length}</td>
                    <td className="py-2 pr-4 align-top">
                      <button
                        type="button"
                        onClick={() => !l.isActive && setConfirmingActivate({ id: l.id, nom: l.nom })}
                        disabled={activatingListeId !== null}
                        title={l.isActive ? "Liste active" : "Activer cette liste"}
                        className={[
                          "text-lg leading-none transition-colors",
                          l.isActive
                            ? "text-amber-400 cursor-default"
                            : "text-gray-300 hover:text-amber-400 cursor-pointer",
                          activatingListeId === l.id ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        {activatingListeId === l.id ? "…" : l.isActive ? "★" : "☆"}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-right align-top">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingListeId(l.id)}
                          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          Éditer
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteListe({ id: l.id, nom: l.nom })}
                          disabled={deletingListeId !== null}
                          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                        >
                          {deletingListeId === l.id ? "…" : "Suppr."}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showNewListe && (
        <NouvelleListeModal
          userId={id}
          onClose={() => setShowNewListe(false)}
          onCreated={reloadListes}
        />
      )}
      {editingListeId !== null && (
        <EditListeModal
          userId={id}
          listeId={editingListeId}
          onClose={() => setEditingListeId(null)}
          onSaved={reloadListes}
        />
      )}
      {confirmingActivate !== null && (
        <ConfirmActivateListeModal
          listeNom={confirmingActivate.nom}
          onClose={() => setConfirmingActivate(null)}
          onConfirm={handleActivateListe}
          activating={activatingListeId !== null}
        />
      )}
      {confirmingDeleteListe !== null && (
        <ConfirmDeleteListeModal
          listeNom={confirmingDeleteListe.nom}
          onClose={() => setConfirmingDeleteListe(null)}
          onConfirm={handleDeleteListe}
          deleting={deletingListeId !== null}
        />
      )}
      {showDeleteModal && (
        <ConfirmDeleteModal
          displayName={displayName}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UserEditPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Chargement...</p>}>
      <UserEditInner />
    </Suspense>
  )
}
