"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useFieldErrors } from "@/lib/hooks/useFieldErrors"

const inputCls =
  "border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"

function Field({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`text-xs font-medium uppercase tracking-wide ${error ? "text-red-500" : "text-gray-500"}`}>{label}</label>
      {children}
    </div>
  )
}

function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function NouvellePage() {
  const router = useRouter()
  const [nom, setNom] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManual, setSlugManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fe = useFieldErrors()

  function handleNomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setNom(v)
    fe.clearError("nom")
    if (!slugManual) {
      setSlug(slugify(v))
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value)
    setSlugManual(true)
    fe.clearError("slug")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    fe.clearAll()

    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, slug }),
    })

    if (res.ok) {
      const data = await res.json()
      router.refresh()
      router.push(`/dashboard/pages/${data.id}`)
    } else {
      const data = await res.json()
      if (!fe.setFromApi(data)) {
        setError(data.error ?? "Erreur lors de la creation.")
      }
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/pages" className="text-gray-400 hover:text-gray-700 text-sm">
          &larr; Pages Web
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800">Nouvelle page</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nom" error={fe.hasError("nom")}>
          <input
            type="text"
            className={`${inputCls} ${fe.fieldCls("nom")}`}
            value={nom}
            onChange={handleNomChange}
            placeholder="ex: Conditions generales de vente"
          />
        </Field>

        <Field label="Slug" error={fe.hasError("slug")}>
          <input
            type="text"
            className={`${inputCls} ${fe.fieldCls("slug")}`}
            value={slug}
            onChange={handleSlugChange}
            placeholder="ex: cgv"
          />
          <span className="text-xs text-gray-400">a-z, 0-9, tirets uniquement</span>
        </Field>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Creation..." : "Creer et editer"}
          </button>
          <Link href="/dashboard/pages" className="text-sm text-gray-500 hover:text-gray-800">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
