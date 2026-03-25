"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useDataList } from "@/lib/hooks/use-data-list"

type AdminUser = {
  id: number
  email: string
  role: string
  notifications: boolean
  createdAt: string
}

type SortKey = "email" | "role" | "createdAt"
type SortDir = "asc" | "desc"

function sorted(list: AdminUser[], key: SortKey, dir: SortDir): AdminUser[] {
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

export default function AdminUsersPage() {
  const router = useRouter()
  const { data: admins, loading, error, refetch } = useDataList<AdminUser>("/api/admin-users")
  const [sortKey, setSortKey] = useState<SortKey>("email")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const onFocus = () => refetch()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refetch])

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

  const filtered = admins.filter((a) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return a.email.toLowerCase().includes(q)
  })
  const rows = sorted(filtered, sortKey, sortDir)
  const isFiltering = search.trim().length > 0

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Administrateurs</h1>
        <Link
          href="/dashboard/admin-users/nouveau"
          className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
        >
          + Nouvel administrateur
        </Link>
      </div>

      {/* Barre de recherche + compteur */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Rechercher par email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          {isFiltering
            ? `${rows.length} résultat${rows.length !== 1 ? "s" : ""} sur ${admins.length}`
            : `${admins.length} administrateur${admins.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Tableau */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th
              className={`text-left py-3 pl-3 pr-4 font-semibold cursor-pointer select-none transition-colors ${sortKey === "email" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("email")}
            >
              Email
              <SortIcon active={sortKey === "email"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-4 font-semibold w-32 cursor-pointer select-none transition-colors ${sortKey === "role" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("role")}
            >
              Rôle
              <SortIcon active={sortKey === "role"} dir={sortDir} />
            </th>
            <th className="text-left py-3 pr-4 font-semibold w-32 text-gray-500">
              Notifications
            </th>
            <th
              className={`text-left py-3 pr-3 font-semibold w-40 cursor-pointer select-none transition-colors ${sortKey === "createdAt" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("createdAt")}
            >
              Date de création
              <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr
              key={a.id}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={() => router.push(`/dashboard/admin-users/${a.id}`)}
            >
              <td className="py-3 pl-3 pr-4 text-gray-800 group-hover:text-gray-900 font-medium group-hover:underline underline-offset-2">
                {a.email}
              </td>
              <td className="py-3 pr-4 text-gray-600 capitalize">
                {a.role}
              </td>
              <td className="py-3 pr-4">
                {a.notifications ? (
                  <span className="text-xs text-green-600 font-medium">Actif</span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Inactif</span>
                )}
              </td>
              <td className="py-3 pr-3 text-gray-500">
                {new Date(a.createdAt).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-8">
          {isFiltering
            ? `Aucun résultat pour « ${search.trim()} »`
            : "Aucun administrateur trouvé."}
        </p>
      )}
    </div>
  )
}
