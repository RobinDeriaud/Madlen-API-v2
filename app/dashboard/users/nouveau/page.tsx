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

export default function NouvelUtilisateurPage() {
  const router = useRouter()

  const [f, setF] = useState({
    email: "",
    password: "",
    nom: "",
    prenom: "",
    user_type: "NONE",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fe = useFieldErrors()

  function set(key: keyof typeof f) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setF((prev) => ({ ...prev, [key]: e.target.value }))
      setError(null)
      fe.clearError(key)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Client-side validation
    const valid = fe.validate([
      { field: "email", value: f.email, label: "Email" },
      { field: "password", value: f.password, label: "Mot de passe" },
    ])
    if (!valid) { setSaving(false); return }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: f.email,
        password: f.password,
        nom: f.nom || null,
        prenom: f.prenom || null,
        user_type: f.user_type,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.refresh()
      router.push(`/dashboard/users/${data.id}?emailSent=1`)
    } else {
      const data = await res.json()
      if (!fe.setFromApi(data)) {
        setError(data.error ?? "Erreur lors de la création.")
      }
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/users" className="text-gray-400 hover:text-gray-700 text-sm">
          ← Utilisateurs
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800">Nouvel utilisateur</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom">
            <input type="text" className={inputCls} value={f.prenom} onChange={set("prenom")} placeholder="Marie" />
          </Field>
          <Field label="Nom">
            <input type="text" className={inputCls} value={f.nom} onChange={set("nom")} placeholder="Dupont" />
          </Field>
        </div>

        <Field label="Email *" error={fe.hasError("email")}>
          <input type="email" className={`${inputCls} ${fe.fieldCls("email")}`} value={f.email} onChange={set("email")} placeholder="marie@exemple.fr" />
        </Field>

        <Field label="Mot de passe * (min. 6 caractères)" error={fe.hasError("password")}>
          <input type="password" className={`${inputCls} ${fe.fieldCls("password")}`} value={f.password} onChange={set("password")} minLength={6} />
        </Field>

        <Field label="Type">
          <select className={inputCls} value={f.user_type} onChange={set("user_type")}>
            <option value="NONE">Aucun</option>
            <option value="PATIENT">Patient</option>
            <option value="PRATICIEN">Praticien</option>
          </select>
        </Field>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            suppressHydrationWarning
          >
            {saving ? "Création…" : "Créer et éditer"}
          </button>
          <Link href="/dashboard/users" className="text-sm text-gray-500 hover:text-gray-800">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
