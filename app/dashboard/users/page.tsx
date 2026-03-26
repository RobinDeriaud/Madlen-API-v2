"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useDataList } from "@/lib/hooks/use-data-list"

type UserType = "NONE" | "PATIENT" | "PRATICIEN"

type User = {
  id: number
  email: string
  nom: string | null
  prenom: string | null
  user_type: UserType
  confirmed: boolean
  licenceActive: boolean
  kitInstalled: boolean
  kitPurchasedAt: string | null
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
  const { data: users, loading, error, refetch } = useDataList<User>("/api/users")
  const [sortKey, setSortKey] = useState<SortKey>("nom")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<UserType | "ALL">("ALL")
  const [kitFilter, setKitFilter] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  // Refetch quand la page redevient visible (retour depuis une page détail)
  useEffect(() => {
    const onFocus = () => refetch()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refetch])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/kit-installations", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        if (data.synced > 0) {
          const parts: string[] = []
          const l = data.details?.licences
          if (l) {
            const lParts: string[] = []
            if (l.active) lParts.push(`${l.active} active${l.active > 1 ? "s" : ""}`)
            if (l.inactive) lParts.push(`${l.inactive} inactive${l.inactive > 1 ? "s" : ""}`)
            parts.push(`licences : ${lParts.join(", ")}`)
          }
          const k = data.details?.kits
          if (k) {
            const kParts: string[] = []
            if (k.active) kParts.push(`${k.active} actif${k.active > 1 ? "s" : ""}`)
            if (k.refunded) kParts.push(`${k.refunded} remboursé${k.refunded > 1 ? "s" : ""}`)
            parts.push(`kits : ${kParts.join(", ")}`)
          }
          setSyncResult(`${data.synced} user${data.synced > 1 ? "s" : ""} synchronisé${data.synced > 1 ? "s" : ""} (${parts.join(" · ")})`)
          refetch()
          window.dispatchEvent(new CustomEvent("kit-data-changed"))
        } else {
          setSyncResult("Tout est à jour")
        }
      } else {
        setSyncResult("Erreur de synchronisation")
      }
    } catch {
      setSyncResult("Erreur de synchronisation")
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 4000)
    }
  }

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

  const kitToInstallCount = users.filter((u) => u.kitPurchasedAt !== null && !u.kitInstalled).length

  const filtered = users
    .filter((u) => typeFilter === "ALL" || u.user_type === typeFilter)
    .filter((u) => !kitFilter || (u.kitPurchasedAt !== null && !u.kitInstalled))
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
  const isFiltering = search.trim().length > 0 || typeFilter !== "ALL" || kitFilter

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <div className="flex items-center gap-3">
          {syncResult && (
            <span className="text-xs text-gray-500">{syncResult}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 disabled:opacity-50 border border-gray-200"
          >
            {syncing ? "Synchronisation…" : "Synchroniser Stripe"}
          </button>
          <Link
            href="/dashboard/users/nouveau"
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
          >
            + Nouvel utilisateur
          </Link>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4 flex-wrap">
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
        <span className="border-l border-gray-200 mx-1" />
        <button
          onClick={() => setKitFilter(!kitFilter)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
            kitFilter
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
          }`}
        >
          Kit à installer
          {kitToInstallCount > 0 && (
            <span
              className={`inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] rounded-full text-[10px] font-bold leading-none px-1 ${
                kitFilter
                  ? "bg-white text-amber-600"
                  : "bg-amber-500 text-white"
              }`}
            >
              {kitToInstallCount}
            </span>
          )}
        </button>
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
            <th className="text-left py-3 pr-4 font-semibold w-24 text-gray-500">
              Licence
            </th>
            <th className="text-left py-3 pr-4 font-semibold w-28 text-gray-500">
              Kit
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
              onClick={() => router.push(`/dashboard/users/${u.id}${kitFilter ? "?tab=licence" : ""}`)}
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
              <td className="py-3 pr-4">
                {u.licenceActive ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-50 border-green-300 text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 border-gray-200 text-gray-400">
                    Inactive
                  </span>
                )}
              </td>
              <td className="py-3 pr-4">
                {u.kitPurchasedAt !== null ? (
                  u.kitInstalled ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-50 border-green-300 text-green-700">
                      Installé
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 border-amber-300 text-amber-700">
                      À installer
                    </span>
                  )
                ) : (
                  <span className="text-gray-300">—</span>
                )}
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
