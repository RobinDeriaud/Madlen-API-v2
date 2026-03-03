"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

const MACRO_OPTIONS = [
  { value: "AJUSTEMENT_100", label: "Ajustement (100)" },
  { value: "HYGIENE_PHONATOIRE_200", label: "Hygiène phonatoire (200)" },
  { value: "PRAXIES_300", label: "Praxies (300)" },
  { value: "RENDEMENT_VOCAL_400", label: "Rendement vocal (400)" },
  { value: "FLEXIBILITE_VOCALE_500", label: "Flexibilité vocale (500)" },
  { value: "INTELLIGIBILITE_600", label: "Intelligibilité (600)" },
  { value: "FLUENCE_700", label: "Fluence (700)" },
]

const inputCls =
  "border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"

export default function NouvelExercicePage() {
  const router = useRouter()
  const [numero, setNumero] = useState("")
  const [nom, setNom] = useState("")
  const [macro, setMacro] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch("/api/exercices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero: numero !== "" ? parseInt(numero) : null,
        nom: nom || null,
        macro: macro || null,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/dashboard/exercices/${data.id}`)
    } else {
      const data = await res.json()
      setError(data.error ?? "Erreur lors de la création.")
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/exercices" className="text-gray-400 hover:text-gray-700 text-sm">
          ← Exercices
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800">Nouvel exercice</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Numéro</label>
          <input
            type="number"
            className={inputCls}
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="ex: 101"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nom</label>
          <input
            type="text"
            className={inputCls}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom de l'exercice"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Macro</label>
          <select className={inputCls} value={macro} onChange={(e) => setMacro(e.target.value)}>
            <option value="">— aucune —</option>
            {MACRO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Création…" : "Créer et éditer"}
          </button>
          <Link href="/dashboard/exercices" className="text-sm text-gray-500 hover:text-gray-800">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
