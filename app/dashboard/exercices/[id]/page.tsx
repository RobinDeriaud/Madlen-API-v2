"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
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
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      className={inputCls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— aucun —</option>
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

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Form state — all strings for easy input binding
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

  useEffect(() => {
    fetch(`/api/exercices/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Introuvable")
        return r.json()
      })
      .then((data: ExerciceData) => {
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

  function set(key: keyof typeof f) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setF((prev) => ({ ...prev, [key]: e.target.value }))
      setSaved(false)
      setSaveError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)

    // Parse boutons JSON
    let boutons: unknown = null
    if (f.boutons.trim()) {
      try {
        boutons = JSON.parse(f.boutons)
      } catch {
        setSaveError("Le champ « Boutons » contient du JSON invalide.")
        setSaving(false)
        return
      }
    }

    const body = {
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

    const res = await fetch(`/api/exercices/${id}`, {
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

  if (loading) return <p className="text-gray-500">Chargement...</p>
  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/exercices" className="text-gray-400 hover:text-gray-700 text-sm">
          ← Exercices
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800">
          {f.nom || `Exercice #${id}`}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <SectionTitle>Identification</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Numéro">
            <input type="number" className={inputCls} value={f.numero} onChange={set("numero")} />
          </Field>
          <Field label="Sigle">
            <input type="text" className={inputCls} value={f.sigle} onChange={set("sigle")} />
          </Field>
        </div>
        <Field label="Nom">
          <input type="text" className={inputCls} value={f.nom} onChange={set("nom")} />
        </Field>
        <Field label="Résumé (bref)">
          <textarea className={textareaCls} value={f.bref} onChange={set("bref")} rows={2} />
        </Field>

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

        <SectionTitle>Classification</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Macro">
            <EnumSelect value={f.macro} onChange={(v) => { setF((p) => ({ ...p, macro: v })); setSaved(false) }} options={MACRO_OPTIONS} />
          </Field>
          <Field label="Axe">
            <EnumSelect value={f.axe} onChange={(v) => { setF((p) => ({ ...p, axe: v })); setSaved(false) }} options={AXE_OPTIONS} />
          </Field>
          <Field label="Outil">
            <EnumSelect value={f.outil} onChange={(v) => { setF((p) => ({ ...p, outil: v })); setSaved(false) }} options={OUTIL_OPTIONS} />
          </Field>
          <Field label="Récurrence">
            <EnumSelect value={f.recurrence} onChange={(v) => { setF((p) => ({ ...p, recurrence: v })); setSaved(false) }} options={RECURRENCE_OPTIONS} />
          </Field>
        </div>
        <Field label="Paramètre outil">
          <input type="text" className={inputCls} value={f.outil_param} onChange={set("outil_param")} />
        </Field>

        <SectionTitle>Paramètres</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Durée (min)">
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
          <Field label="Publié le">
            <input type="datetime-local" className={inputCls} value={f.publishedAt} onChange={set("publishedAt")} />
          </Field>
        </div>

        <SectionTitle>Avancé</SectionTitle>
        <Field label="Boutons (JSON)">
          <textarea
            className={`${textareaCls} font-mono text-xs`}
            value={f.boutons}
            onChange={set("boutons")}
            rows={4}
            placeholder='{"key": "value"}'
          />
        </Field>

        {/* Actions */}
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
            onClick={() => router.push("/dashboard/exercices")}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Annuler
          </button>
          {saved && <span className="text-green-600 text-sm">Sauvegardé.</span>}
          {saveError && <span className="text-red-500 text-sm">{saveError}</span>}
        </div>
      </form>
    </div>
  )
}
