"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type UserType = "NONE" | "PATIENT" | "PRATICIEN"

type User = {
  id: number
  email: string
  nom: string | null
  prenom: string | null
  user_type: UserType
  confirmed: boolean
}

type UserTypeConfig = {
  label: string
  bg: string
  border: string
  text: string
}

const USER_TYPE_CONFIG: Record<UserType, UserTypeConfig> = {
  NONE: {
    label: "Aucun",
    bg: "#F3F4F6",
    border: "#D1D5DB",
    text: "#6B7280",
  },
  PATIENT: {
    label: "Patient",
    bg: "#DBEAFE",
    border: "#93C5FD",
    text: "#1D4ED8",
  },
  PRATICIEN: {
    label: "Praticien",
    bg: "#D1FAE5",
    border: "#6EE7B7",
    text: "#065F46",
  },
}

function UserTypeBadge({ type }: { type: UserType }) {
  const config = USER_TYPE_CONFIG[type] ?? USER_TYPE_CONFIG.NONE
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
        color: config.text,
      }}
    >
      {config.label}
    </span>
  )
}

type SortKey = "nom" | "prenom" | "email" | "user_type"
type SortDir = "asc" | "desc"

function sorted(list: User[], key: SortKey, dir: SortDir): User[] {
  return [...list].sort((a, b) => {
    const av = a[key] ?? ""
    const bv = b[key] ?? ""
    const cmp = String(av).localeCompare(String(bv), "fr", { sensitivity: "base" })
    return dir === "asc" ? cmp : -cmp
  })
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-gray-700">{dir === "asc" ? "↑" : "↓"}</span>
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("nom")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<UserType | "ALL">("ALL")

  useEffect(() => {
    fetch("/api/users")
      .then((r) => {
        if (!r.ok) throw new Error("Erreur de chargement")
        return r.json()
      })
      .then((data) => setUsers(data))
      .catch(() => setError("Impossible de charger les utilisateurs."))
      .finally(() => setLoading(false))
  }, [])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
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

  const filtered = users
    .filter((u) => typeFilter === "ALL" || u.user_type === typeFilter)
    .filter((u) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        (u.nom ?? "").toLowerCase().includes(q) ||
        (u.prenom ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  const rows = sorted(filtered, sortKey, sortDir)
  const isFiltering = search.trim().length > 0 || typeFilter !== "ALL"

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <Link
          href="/dashboard/users/nouveau"
          className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
        >
          + Nouvel utilisateur
        </Link>
      </div>

      {/* Filtres par type */}
      <div className="flex gap-2 mb-4">
        {(["ALL", "PATIENT", "PRATICIEN"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === t
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {t === "ALL" ? "Tous" : t === "PATIENT" ? "Patients" : "Praticiens"}
          </button>
        ))}
      </div>

      {/* Barre de recherche + compteur */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Rechercher par nom, prénom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          {isFiltering
            ? `${rows.length} résultat${rows.length !== 1 ? "s" : ""} sur ${users.length}`
            : `${users.length} utilisateur${users.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Tableau */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th
              className={`text-left py-3 pl-3 pr-4 font-semibold w-36 cursor-pointer select-none transition-colors ${sortKey === "nom" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("nom")}
            >
              Nom
              <SortIcon active={sortKey === "nom"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-4 font-semibold w-36 cursor-pointer select-none transition-colors ${sortKey === "prenom" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("prenom")}
            >
              Prénom
              <SortIcon active={sortKey === "prenom"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-4 font-semibold cursor-pointer select-none transition-colors ${sortKey === "email" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("email")}
            >
              Email
              <SortIcon active={sortKey === "email"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-4 font-semibold w-32 cursor-pointer select-none transition-colors ${sortKey === "user_type" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("user_type")}
            >
              Rôle
              <SortIcon active={sortKey === "user_type"} dir={sortDir} />
            </th>
            <th className="text-left py-3 pr-3 font-semibold w-24 text-gray-500">
              Statut
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr
              key={u.id}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={() => router.push(`/dashboard/users/${u.id}`)}
            >
              <td className="py-3 pl-3 pr-4 text-gray-800 group-hover:text-gray-900 font-medium">
                {u.nom ?? <span className="text-gray-300">—</span>}
              </td>
              <td className="py-3 pr-4 text-gray-700">
                {u.prenom ?? <span className="text-gray-300">—</span>}
              </td>
              <td className="py-3 pr-4 text-gray-600 group-hover:underline underline-offset-2">
                {u.email}
              </td>
              <td className="py-3 pr-4">
                <UserTypeBadge type={u.user_type} />
              </td>
              <td className="py-3 pr-3">
                {u.confirmed ? (
                  <span className="text-xs text-green-600 font-medium">Confirmé</span>
                ) : (
                  <span className="text-xs text-amber-500 font-medium">En attente</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-8">
          {isFiltering
            ? `Aucun résultat pour « ${search.trim()} »`
            : "Aucun utilisateur trouvé."}
        </p>
      )}
    </div>
  )
}
