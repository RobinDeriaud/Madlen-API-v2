"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useFieldErrors } from "@/lib/hooks/useFieldErrors"

// ─── Enum options ────────────────────────────────────────────────────────────

const MACRO_OPTIONS = [
  { value: "AJUSTEMENT_100", label: "Ajustement (100)" },
  { value: "HYGIENE_PHONATOIRE_200", label: "Hygiène phonatoire (200)" },
  { value: "PRAXIES_300", label: "Praxies (300)" },
  { value: "RENDEMENT_VOCAL_400", label: "Rendement vocal (400)" },
  { value: "FLEXIBILITE_VOCALE_500", label: "Flexibilité vocale (500)" },
  { value: "INTELLIGIBILITE_600", label: "Intelligibilité (600)" },
  { value: "FLUENCE_700", label: "Fluence (700)" },
]

const AXE_OPTIONS = [
  { value: "AJUSTEMENT_100", label: "Ajustement (100)" },
  { value: "REGULATION_ECHANGES_130", label: "Régulation des échanges (130)" },
  { value: "POSTURE_140", label: "Posture (140)" },
  { value: "HYGIENE_ALIMENTAIRE_210", label: "Hygiène alimentaire (210)" },
  { value: "ECONOMIE_VOCALE_220", label: "Économie vocale (220)" },
  { value: "ECHAUFFEMENT_RECUPERATION_230", label: "Échauffement / Récupération (230)" },
  { value: "EXERCICES_SPECIFIQUES_240", label: "Exercices spécifiques (240)" },
  { value: "PROPRIOCEPTION_ARTICULATOIRE_310", label: "Proprioception articulatoire (310)" },
  { value: "PRAXIES_SIMPLES_320", label: "Praxies simples (320)" },
  { value: "PRAXIES_COORDONNEES_330", label: "Praxies coordonnées (330)" },
  { value: "RESPIRATION_410", label: "Respiration (410)" },
  { value: "RESPIRATION_AVANCEE_420", label: "Respiration avancée (420)" },
  { value: "TONICITE_LABIALE_430", label: "Tonicité labiale (430)" },
  { value: "TONICITE_VELAIRE_440", label: "Tonicité vélaire (440)" },
  { value: "TONICITE_LINGUALE_450", label: "Tonicité linguale (450)" },
  { value: "CONTROLE_HAUTEUR_510", label: "Contrôle de hauteur (510)" },
  { value: "PASSAGES_MECANISMES_520", label: "Passages / Mécanismes (520)" },
  { value: "CONTROLE_INTENSITE_530", label: "Contrôle d'intensité (530)" },
  { value: "DISSOCIATION_PARAMETRES_540", label: "Dissociation des paramètres (540)" },
  { value: "DYNAMIQUE_VOCALE_550", label: "Dynamique vocale (550)" },
  { value: "PRODUCTION_VOYELLES_610", label: "Production des voyelles (610)" },
  { value: "PRODUCTION_CONSONNES_620", label: "Production des consonnes (620)" },
  { value: "SYLLABES_PROCESSUS_630", label: "Syllabes / Processus (630)" },
  { value: "TRAVAIL_PROSODIE_640", label: "Travail de la prosodie (640)" },
  { value: "DIADOCOCINETIQUES_CONSONANTIQUES_710", label: "Diadococinetiques consonantiques (710)" },
  { value: "DIADOCOCINETIQUES_VOCALIQUES_720", label: "Diadococinetiques vocaliques (720)" },
  { value: "DIADOCOCINETIQUES_COORDONNEES_730", label: "Diadococinetiques coordonnées (730)" },
  { value: "DIADOCOCINETIQUES_MOTS_740", label: "Diadococinetiques mots (740)" },
  { value: "PHRASES_FONCTIONNELLES_750", label: "Phrases fonctionnelles (750)" },
]

const OUTIL_OPTIONS = [
  { value: "SPECTROGRAMME", label: "Spectrogramme" },
  { value: "PROSODIE", label: "Prosodie" },
  { value: "PUISSANCE", label: "Puissance" },
  { value: "IMAGE", label: "Image" },
  { value: "DIADO", label: "Diado" },
  { value: "PHONEME", label: "Phonème" },
  { value: "PHONETOGRAMME", label: "Phonétogramme" },
  { value: "MOTS", label: "Mots" },
  { value: "TRAITS", label: "Traits" },
  { value: "PRAXIES", label: "Praxies" },
  { value: "CHOIX", label: "Choix" },
  { value: "VIDEO", label: "Vidéo" },
  { value: "LIEN", label: "Lien" },
  { value: "HISTOGRAMME", label: "Histogramme" },
]

const RECURRENCE_OPTIONS = [
  { value: "FAIBLE", label: "Faible" },
  { value: "MOYENNE", label: "Moyenne" },
  { value: "HAUTE", label: "Haute" },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type ExerciceData = {
  id: number
  documentId: string
  numero: number | null
  nom: string | null
  sigle: string | null
  bref: string | null
  but: string | null
  instructions: string | null
  astuce: string | null
  commentaires: string | null
  axe: string | null
  macro: string | null
  outil: string | null
  outil_param: string | null
  duree: number
  recurrence: string | null
  auteur: string | null
  version: string | null
  date: string | null
  boutons: unknown
  fichier: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateInput(iso: string | null): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}

function toDatetimeInput(iso: string | null): string {
  if (!iso) return ""
  return iso.slice(0, 16)
}

// ─── ListeElement types ─────────────────────────────────────────────────────

type ReponseElementValue = "NULL" | "OUI" | "NON"

type ListeElementLocal = {
  _key: number
  id?: number
  element: string
  reponse: ReponseElementValue
  order: number
}

type ListeElementFromApi = {
  id: number
  element: string | null
  reponse: string | null
  order: number | null
}

const REPONSE_OPTIONS: { value: ReponseElementValue; label: string }[] = [
  { value: "NULL", label: "---" },
  { value: "OUI", label: "Oui" },
  { value: "NON", label: "Non" },
]

// ─── AudioFile type ─────────────────────────────────────────────────────────

type AudioFileData = {
  id: number
  name: string
  url: string
  mime: string | null
  size: number | null
  ext: string | null
}

/** Extract iteration number from filename like "exercice-101-3" → 3 */
function audioIteration(name: string): number | null {
  const match = name.match(/^exercice-\d+-(\d+)$/i)
  return match ? parseInt(match[1]) : null
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`text-xs font-medium uppercase tracking-wide ${error ? "text-red-500" : "text-gray-500"}`}>{label}</label>
      {children}
    </div>
  )
}

const inputCls = "border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
const textareaCls = `${inputCls} resize-y min-h-[80px]`

function EnumSelect({
  value,
  onChange,
  options,
  extraCls,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  extraCls?: string
}) {
  return (
    <select
      className={`${inputCls} ${extraCls ?? ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">--- aucun ---</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-4 pb-1 border-b border-gray-100">
      {children}
    </h2>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ExerciceEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const keyRef = useRef(0)
  function nextKey() { return ++keyRef.current }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [published, setPublished] = useState(false)
  const [togglingPublish, setTogglingPublish] = useState(false)
  const [listeLoading, setListeLoading] = useState(true)
  const fe = useFieldErrors()

  // Form state
  const [f, setF] = useState({
    numero: "",
    nom: "",
    sigle: "",
    bref: "",
    but: "",
    instructions: "",
    astuce: "",
    commentaires: "",
    axe: "",
    macro: "",
    outil: "",
    outil_param: "",
    duree: "2",
    recurrence: "",
    auteur: "",
    version: "",
    date: "",
    boutons: "",
    fichier: "",
    publishedAt: "",
  })

  // Liste elements state
  const [listeItems, setListeItems] = useState<ListeElementLocal[]>([])

  // Audio files state
  const [audioFiles, setAudioFiles] = useState<AudioFileData[]>([])
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const audioUploadRef = useRef<HTMLInputElement>(null)
  const itemAudioRef = useRef<HTMLInputElement>(null)
  const [itemAudioIndex, setItemAudioIndex] = useState<number | null>(null)

  // Load exercice data
  useEffect(() => {
    fetch(`/api/exercices/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Introuvable")
        return r.json()
      })
      .then((data: ExerciceData & { audioFiles?: AudioFileData[] }) => {
        setPublished(data.publishedAt !== null)
        if (data.audioFiles) setAudioFiles(data.audioFiles)
        setF({
          numero: data.numero != null ? String(data.numero) : "",
          nom: data.nom ?? "",
          sigle: data.sigle ?? "",
          bref: data.bref ?? "",
          but: data.but ?? "",
          instructions: data.instructions ?? "",
          astuce: data.astuce ?? "",
          commentaires: data.commentaires ?? "",
          axe: data.axe ?? "",
          macro: data.macro ?? "",
          outil: data.outil ?? "",
          outil_param: data.outil_param ?? "",
          duree: String(data.duree ?? 2),
          recurrence: data.recurrence ?? "",
          auteur: data.auteur ?? "",
          version: data.version ?? "",
          date: toDateInput(data.date),
          boutons: data.boutons != null ? JSON.stringify(data.boutons, null, 2) : "",
          fichier: data.fichier ?? "",
          publishedAt: toDatetimeInput(data.publishedAt),
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // Load liste elements
  useEffect(() => {
    fetch(`/api/exercices/${id}/liste-elements`)
      .then((r) => r.json())
      .then((data: ListeElementFromApi[]) => {
        setListeItems(
          data.map((d) => ({
            _key: nextKey(),
            id: d.id,
            element: d.element ?? "",
            reponse: (d.reponse as ReponseElementValue) ?? "NULL",
            order: d.order ?? 0,
          }))
        )
      })
      .finally(() => setListeLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function set(key: keyof typeof f) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setF((prev) => ({ ...prev, [key]: e.target.value }))
      setSaved(false)
      setSaveError(null)
      fe.clearError(key)
    }
  }

  // Liste element handlers
  function addItem() {
    setListeItems((prev) => [...prev, { _key: nextKey(), element: "", reponse: "NULL", order: prev.length }])
    setSaved(false)
  }

  function removeItem(key: number) {
    setListeItems((prev) => prev.filter((i) => i._key !== key))
    setSaved(false)
  }

  function updateItem(key: number, field: "element" | "reponse", value: string) {
    setListeItems((prev) => prev.map((i) => (i._key === key ? { ...i, [field]: value } : i)))
    setSaved(false)
  }

  function moveUp(index: number) {
    if (index === 0) return
    setListeItems((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setSaved(false)
  }

  function moveDown(index: number) {
    setListeItems((prev) => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
    setSaved(false)
  }

  // Single save handler for everything
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    fe.clearAll()

    // Parse boutons JSON
    let boutons: unknown = null
    if (f.boutons.trim()) {
      try {
        boutons = JSON.parse(f.boutons)
      } catch {
        setSaveError("Le champ Boutons contient du JSON invalide.")
        setSaving(false)
        return
      }
    }

    const exerciceBody = {
      numero: f.numero !== "" ? parseInt(f.numero) : null,
      nom: f.nom || null,
      sigle: f.sigle || null,
      bref: f.bref || null,
      but: f.but || null,
      instructions: f.instructions || null,
      astuce: f.astuce || null,
      commentaires: f.commentaires || null,
      axe: f.axe || null,
      macro: f.macro || null,
      outil: f.outil || null,
      outil_param: f.outil_param || null,
      duree: f.duree !== "" ? parseInt(f.duree) : 2,
      recurrence: f.recurrence || null,
      auteur: f.auteur || null,
      version: f.version || null,
      date: f.date || null,
      boutons,
      fichier: f.fichier || null,
      publishedAt: f.publishedAt || null,
    }

    const listeBody = listeItems.map((item, i) => ({
      element: item.element || null,
      reponse: item.reponse,
      order: i,
    }))

    // Save both in parallel
    const [exerciceRes, listeRes] = await Promise.all([
      fetch(`/api/exercices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exerciceBody),
      }),
      fetch(`/api/exercices/${id}/liste-elements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listeBody),
      }),
    ])

    if (exerciceRes.ok && listeRes.ok) {
      // Refresh liste items with server data
      const listeData: ListeElementFromApi[] = await listeRes.json()
      setListeItems(
        listeData.map((d) => ({
          _key: nextKey(),
          id: d.id,
          element: d.element ?? "",
          reponse: (d.reponse as ReponseElementValue) ?? "NULL",
          order: d.order ?? 0,
        }))
      )
      setSaved(true)
    } else if (!exerciceRes.ok) {
      const data = await exerciceRes.json()
      if (!fe.setFromApi(data)) {
        setSaveError(data.error ?? "Erreur lors de la sauvegarde de l'exercice.")
      }
    } else {
      const data = await listeRes.json()
      setSaveError(data.error ?? "Erreur lors de la sauvegarde de la liste.")
    }
    setSaving(false)
  }

  async function togglePublish() {
    setTogglingPublish(true)
    const res = await fetch(`/api/exercices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    })
    if (res.ok) {
      const data: ExerciceData = await res.json()
      setPublished(data.publishedAt !== null)
      setF((prev) => ({ ...prev, publishedAt: toDatetimeInput(data.publishedAt) }))
    }
    setTogglingPublish(false)
  }

  // ─── Audio helpers ───────────────────────────────────────────────────────

  const refetchAudio = useCallback(() => {
    fetch(`/api/exercices/${id}`)
      .then((r) => r.json())
      .then((data: { audioFiles?: AudioFileData[] }) => {
        if (data.audioFiles) setAudioFiles(data.audioFiles)
      })
  }, [id])

  async function handleAudioUpload(files: FileList | null, itemPosition?: number) {
    if (!files || files.length === 0) return
    setUploadingAudio(true)

    const formData = new FormData()
    formData.append("exerciceId", id)

    for (const file of Array.from(files)) {
      // If uploading for a specific list item, rename to convention
      if (itemPosition != null && f.numero) {
        const ext = file.name.substring(file.name.lastIndexOf(".")) || ".mp3"
        const newName = `exercice-${f.numero}-${itemPosition}${ext}`
        formData.append("files", new File([file], newName, { type: file.type }))
      } else {
        formData.append("files", file)
      }
    }

    try {
      await fetch("/api/audio-files", { method: "POST", body: formData })
      refetchAudio()
    } finally {
      setUploadingAudio(false)
      if (audioUploadRef.current) audioUploadRef.current.value = ""
      if (itemAudioRef.current) itemAudioRef.current.value = ""
      setItemAudioIndex(null)
    }
  }

  async function handleAudioDelete(audioId: number) {
    if (!window.confirm("Supprimer ce fichier audio ?")) return
    await fetch(`/api/audio-files/${audioId}`, { method: "DELETE" })
    if (playingAudioId === audioId) setPlayingAudioId(null)
    refetchAudio()
  }

  /** Map iteration number → audioFile for quick lookup in list items */
  const audioByIteration = new Map<number, AudioFileData>()
  for (const af of audioFiles) {
    const iter = audioIteration(af.name)
    if (iter !== null) audioByIteration.set(iter, af)
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>
  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-3xl pb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exercices" className="text-gray-400 hover:text-gray-700 text-sm">
            ← Exercices
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-800">
            {f.nom || `Exercice #${id}`}
          </h1>
        </div>
        <button
          type="button"
          onClick={togglePublish}
          disabled={togglingPublish}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            published
              ? "bg-green-100 text-green-800 hover:bg-green-200 border border-green-300"
              : "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300"
          } ${togglingPublish ? "opacity-50 cursor-wait" : ""}`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${published ? "bg-green-500" : "bg-amber-500"}`} />
          {published ? "Publie" : "Brouillon"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* ── Identification ── */}
        <SectionTitle>Identification</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Numero" error={fe.hasError("numero")}>
            <input type="number" className={`${inputCls} ${fe.fieldCls("numero")}`} value={f.numero} onChange={set("numero")} />
          </Field>
          <Field label="Sigle" error={fe.hasError("sigle")}>
            <input type="text" className={`${inputCls} ${fe.fieldCls("sigle")}`} value={f.sigle} onChange={set("sigle")} />
          </Field>
        </div>
        <Field label="Nom" error={fe.hasError("nom")}>
          <input type="text" className={`${inputCls} ${fe.fieldCls("nom")}`} value={f.nom} onChange={set("nom")} />
        </Field>
        <Field label="Resume (bref)">
          <textarea className={textareaCls} value={f.bref} onChange={set("bref")} rows={2} />
        </Field>

        {/* ── Contenu ── */}
        <SectionTitle>Contenu</SectionTitle>
        <Field label="But">
          <textarea className={textareaCls} value={f.but} onChange={set("but")} />
        </Field>
        <Field label="Instructions">
          <textarea className={textareaCls} value={f.instructions} onChange={set("instructions")} rows={4} />
        </Field>
        <Field label="Astuce">
          <textarea className={textareaCls} value={f.astuce} onChange={set("astuce")} />
        </Field>
        <Field label="Commentaires">
          <textarea className={textareaCls} value={f.commentaires} onChange={set("commentaires")} />
        </Field>

        {/* ── Liste d'elements ── */}
        <SectionTitle>Liste d&apos;elements</SectionTitle>

        {listeLoading ? (
          <p className="text-gray-400 text-sm">Chargement de la liste...</p>
        ) : (
          <>
            {listeItems.length === 0 && (
              <p className="text-gray-400 text-sm">Aucun element.</p>
            )}

            <div className="flex flex-col gap-2">
              {listeItems.map((item, i) => {
                const itemAudio = audioByIteration.get(i + 1)
                return (
                  <div key={item._key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                    <input
                      type="text"
                      className={`${inputCls} flex-1 min-w-0`}
                      value={item.element}
                      onChange={(e) => updateItem(item._key, "element", e.target.value)}
                      placeholder="Texte de l'element"
                    />
                    <select
                      className={`${inputCls} w-20 shrink-0`}
                      value={item.reponse}
                      onChange={(e) => updateItem(item._key, "reponse", e.target.value)}
                    >
                      {REPONSE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {/* Audio indicator per list item */}
                    {itemAudio ? (
                      <button
                        type="button"
                        onClick={() => setPlayingAudioId(playingAudioId === itemAudio.id ? null : itemAudio.id)}
                        className={`shrink-0 w-7 h-7 rounded-full text-xs flex items-center justify-center transition-colors ${
                          playingAudioId === itemAudio.id
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                        title={`${itemAudio.name}${itemAudio.ext ?? ""}`}
                      >
                        {playingAudioId === itemAudio.id ? "⏸" : "▶"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setItemAudioIndex(i + 1)
                          setTimeout(() => itemAudioRef.current?.click(), 0)
                        }}
                        className="shrink-0 w-7 h-7 rounded-full text-xs flex items-center justify-center bg-gray-50 text-gray-300 hover:bg-gray-100 hover:text-gray-500 border border-dashed border-gray-200 transition-colors"
                        title="Importer un audio pour cet item"
                      >
                        +
                      </button>
                    )}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none"
                        title="Monter"
                      >&#9650;</button>
                      <button
                        type="button"
                        onClick={() => moveDown(i)}
                        disabled={i === listeItems.length - 1}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none"
                        title="Descendre"
                      >&#9660;</button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item._key)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none shrink-0"
                      title="Supprimer"
                    >&#215;</button>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="self-start text-sm text-gray-500 hover:text-gray-800 border border-dashed border-gray-300 rounded px-3 py-1.5 hover:border-gray-500"
            >
              + Ajouter un element
            </button>
          </>
        )}

        {/* ── Fichiers audio ── */}
        <SectionTitle>Fichiers audio</SectionTitle>

        {/* Hidden file inputs */}
        <input
          ref={audioUploadRef}
          type="file"
          accept=".mp3,.wav,.ogg,.webm,.aac,.m4a,.flac"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => { handleAudioUpload(e.target.files); e.target.value = "" }}
        />
        <input
          ref={itemAudioRef}
          type="file"
          accept=".mp3,.wav,.ogg,.webm,.aac,.m4a,.flac"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => { handleAudioUpload(e.target.files, itemAudioIndex ?? undefined); e.target.value = "" }}
        />

        {audioFiles.length === 0 && !uploadingAudio && (
          <p className="text-gray-400 text-sm">Aucun fichier audio associé.</p>
        )}

        {audioFiles.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {audioFiles.map((af) => {
              const iter = audioIteration(af.name)
              return (
                <div key={af.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setPlayingAudioId(playingAudioId === af.id ? null : af.id)}
                    className="text-gray-400 hover:text-gray-700 shrink-0"
                  >
                    {playingAudioId === af.id ? "⏸" : "▶"}
                  </button>
                  <span className="text-gray-800 truncate flex-1" title={`${af.name}${af.ext ?? ""}`}>
                    {af.name}<span className="text-gray-400">{af.ext}</span>
                  </span>
                  {iter !== null && (
                    <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                      item {iter}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 shrink-0">{formatFileSize(af.size)}</span>
                  <button
                    type="button"
                    onClick={() => handleAudioDelete(af.id)}
                    className="text-gray-400 hover:text-red-500 shrink-0"
                    title="Supprimer"
                  >&#215;</button>
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => audioUploadRef.current?.click()}
          disabled={uploadingAudio}
          className="self-start text-sm text-gray-500 hover:text-gray-800 border border-dashed border-gray-300 rounded px-3 py-1.5 hover:border-gray-500 disabled:opacity-50"
        >
          {uploadingAudio ? "Import…" : "+ Importer des audios"}
        </button>

        {/* Audio player element */}
        {playingAudioId && (
          <audio
            src={`/api/audio-files/${playingAudioId}/stream`}
            autoPlay
            onEnded={() => setPlayingAudioId(null)}
            onError={() => setPlayingAudioId(null)}
            className="hidden"
          />
        )}

        {/* ── Classification ── */}
        <SectionTitle>Classification</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Macro" error={fe.hasError("macro")}>
            <EnumSelect value={f.macro} onChange={(v) => { setF((p) => ({ ...p, macro: v })); setSaved(false); fe.clearError("macro") }} options={MACRO_OPTIONS} extraCls={fe.fieldCls("macro")} />
          </Field>
          <Field label="Axe" error={fe.hasError("axe")}>
            <EnumSelect value={f.axe} onChange={(v) => { setF((p) => ({ ...p, axe: v })); setSaved(false); fe.clearError("axe") }} options={AXE_OPTIONS} extraCls={fe.fieldCls("axe")} />
          </Field>
          <Field label="Outil" error={fe.hasError("outil")}>
            <EnumSelect value={f.outil} onChange={(v) => { setF((p) => ({ ...p, outil: v })); setSaved(false); fe.clearError("outil") }} options={OUTIL_OPTIONS} extraCls={fe.fieldCls("outil")} />
          </Field>
          <Field label="Recurrence" error={fe.hasError("recurrence")}>
            <EnumSelect value={f.recurrence} onChange={(v) => { setF((p) => ({ ...p, recurrence: v })); setSaved(false); fe.clearError("recurrence") }} options={RECURRENCE_OPTIONS} extraCls={fe.fieldCls("recurrence")} />
          </Field>
        </div>
        <Field label="Parametre outil">
          <input type="text" className={inputCls} value={f.outil_param} onChange={set("outil_param")} />
        </Field>

        {/* ── Parametres ── */}
        <SectionTitle>Parametres</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Duree (min)">
            <input type="number" className={inputCls} value={f.duree} onChange={set("duree")} min={1} />
          </Field>
          <Field label="Date">
            <input type="date" className={inputCls} value={f.date} onChange={set("date")} />
          </Field>
          <Field label="Auteur">
            <input type="text" className={inputCls} value={f.auteur} onChange={set("auteur")} />
          </Field>
          <Field label="Version">
            <input type="text" className={inputCls} value={f.version} onChange={set("version")} />
          </Field>
          <Field label="Fichier">
            <input type="text" className={inputCls} value={f.fichier} onChange={set("fichier")} placeholder="nom_du_fichier.ext" />
          </Field>
        </div>

        {/* ── Avance ── */}
        <SectionTitle>Avance</SectionTitle>
        <Field label="Boutons (JSON)">
          <textarea
            className={`${textareaCls} font-mono text-xs`}
            value={f.boutons}
            onChange={set("boutons")}
            rows={4}
            placeholder='{"key": "value"}'
          />
        </Field>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/exercices")}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Annuler
          </button>
          {saved && <span className="text-green-600 text-sm">Sauvegarde.</span>}
          {saveError && <span className="text-red-500 text-sm">{saveError}</span>}
        </div>
      </form>
    </div>
  )
}
