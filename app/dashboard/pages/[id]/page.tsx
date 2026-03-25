"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useFieldErrors } from "@/lib/hooks/useFieldErrors"

const WysiwygEditor = dynamic(() => import("../../_components/wysiwyg-editor"), { ssr: false })

type PageData = {
  id: number
  nom: string | null
  slug: string | null
  contenu: string | null
  date_modified: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

function Field({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`text-xs font-medium uppercase tracking-wide ${error ? "text-red-500" : "text-gray-500"}`}>{label}</label>
      {children}
    </div>
  )
}

const inputCls = "border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-4 pb-1 border-b border-gray-100">
      {children}
    </h2>
  )
}

export default function PageEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [published, setPublished] = useState(false)
  const [togglingPublish, setTogglingPublish] = useState(false)
  const fe = useFieldErrors()

  const [nom, setNom] = useState("")
  const [slug, setSlug] = useState("")
  const [contenu, setContenu] = useState("")

  useEffect(() => {
    fetch(`/api/pages/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Introuvable")
        return r.json()
      })
      .then((data: PageData) => {
        setPublished(data.publishedAt !== null)
        setNom(data.nom ?? "")
        setSlug(data.slug ?? "")
        setContenu(data.contenu ?? "")
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function togglePublish() {
    setTogglingPublish(true)
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      })
      if (res.ok) setPublished(!published)
    } finally {
      setTogglingPublish(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    fe.clearAll()

    const res = await fetch(`/api/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom || null,
        slug: slug || null,
        contenu: contenu || null,
      }),
    })

    if (res.ok) {
      setSaved(true)
    } else {
      const data = await res.json()
      if (!fe.setFromApi(data)) {
        setSaveError(data.error ?? "Erreur lors de la sauvegarde.")
      }
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm("Supprimer cette page ? Cette action est irreversible.")) return
    setDeleting(true)
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard/pages")
    } else {
      setDeleting(false)
      setSaveError("Erreur lors de la suppression.")
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Chargement...
      </div>
    )
  if (error)
    return (
      <div className="flex items-center justify-center py-20 text-red-500 text-sm">
        {error}
      </div>
    )

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pages" className="text-gray-400 hover:text-gray-700 text-sm">
            &larr; Pages Web
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-800">{nom || "Sans titre"}</h1>
        </div>
        <button
          onClick={togglePublish}
          disabled={togglingPublish}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            published
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
          } ${togglingPublish ? "opacity-50 cursor-wait" : ""}`}
        >
          {published ? "Publie" : "Brouillon"}
        </button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <SectionTitle>Identification</SectionTitle>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom" error={fe.hasError("nom")}>
            <input
              type="text"
              className={`${inputCls} ${fe.fieldCls("nom")}`}
              value={nom}
              onChange={(e) => { setNom(e.target.value); setSaved(false); fe.clearError("nom") }}
            />
          </Field>

          <Field label="Slug" error={fe.hasError("slug")}>
            <input
              type="text"
              className={`${inputCls} ${fe.fieldCls("slug")}`}
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSaved(false); fe.clearError("slug") }}
            />
            <span className="text-xs text-gray-400">a-z, 0-9, tirets</span>
          </Field>
        </div>

        <SectionTitle>Contenu</SectionTitle>

        <WysiwygEditor value={contenu} onChange={(html) => { setContenu(html); setSaved(false) }} />

        {/* Save / errors */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          {saved && <span className="text-green-600 text-sm">Sauvegarde.</span>}
          {saveError && <span className="text-red-500 text-sm">{saveError}</span>}
        </div>

        {/* Delete */}
        <div className="pt-8 border-t border-gray-100 mt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Suppression..." : "Supprimer cette page"}
          </button>
        </div>
      </form>
    </div>
  )
}
