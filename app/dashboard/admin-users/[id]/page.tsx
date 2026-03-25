"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useFieldErrors } from "@/lib/hooks/useFieldErrors"

type AdminData = {
  id: number
  email: string
  role: string
  notifications: boolean
  createdAt: string
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

export default function AdminEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fe = useFieldErrors()

  const [email, setEmail] = useState("")
  const [role, setRole] = useState("admin")
  const [notifications, setNotifications] = useState(false)
  const [password, setPassword] = useState("")

  useEffect(() => {
    fetch(`/api/admin-users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Introuvable")
        return r.json()
      })
      .then((data: AdminData) => {
        setEmail(data.email)
        setRole(data.role)
        setNotifications(data.notifications)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    fe.clearAll()

    const payload: Record<string, unknown> = { email, role, notifications }
    if (password.trim()) {
      payload.password = password
    }

    const res = await fetch(`/api/admin-users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setSaved(true)
      setPassword("")
    } else {
      const data = await res.json()
      if (!fe.setFromApi(data)) {
        setSaveError(data.error ?? "Erreur lors de la sauvegarde.")
      }
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm("Supprimer cet administrateur ? Cette action est irréversible.")) return
    setDeleting(true)
    const res = await fetch(`/api/admin-users/${id}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard/admin-users")
    } else {
      const data = await res.json()
      setDeleting(false)
      setSaveError(data.error ?? "Erreur lors de la suppression.")
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Chargement…
      </div>
    )
  if (error)
    return (
      <div className="flex items-center justify-center py-20 text-red-500 text-sm">
        {error}
      </div>
    )

  return (
    <div className="max-w-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/admin-users" className="text-gray-400 hover:text-gray-700 text-sm">
          ← Administrateurs
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800">{email}</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Field label="Email" error={fe.hasError("email")}>
          <input
            type="email"
            className={`${inputCls} ${fe.fieldCls("email")}`}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSaved(false); fe.clearError("email") }}
          />
        </Field>

        <Field label="Rôle">
          <select className={inputCls} value={role} onChange={(e) => { setRole(e.target.value); setSaved(false) }}>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => { setNotifications(e.target.checked); setSaved(false) }}
            className="rounded border-gray-300"
          />
          Recevoir les notifications
        </label>

        <Field label="Nouveau mot de passe" error={fe.hasError("password")}>
          <input
            type="password"
            className={`${inputCls} ${fe.fieldCls("password")}`}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setSaved(false); fe.clearError("password") }}
            placeholder="Laisser vide pour ne pas changer"
            minLength={8}
          />
          <span className="text-xs text-gray-400">Min. 8 caractères — vide = inchangé</span>
        </Field>

        {/* Save / errors */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
          {saved && <span className="text-green-600 text-sm">Sauvegardé.</span>}
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
            {deleting ? "Suppression…" : "Supprimer cet administrateur"}
          </button>
        </div>
      </form>
    </div>
  )
}
