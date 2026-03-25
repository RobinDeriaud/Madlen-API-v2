"use client"

import { useEffect, useState } from "react"
import { useDataList } from "@/lib/hooks/use-data-list"

type KitUser = {
  id: number
  email: string
  nom: string | null
  prenom: string | null
  kitInstalled: boolean
  kitPurchasedAt: string
}

type SortKey = "user" | "kitPurchasedAt" | "status"
type SortDir = "asc" | "desc"

function sortValue(item: KitUser, key: SortKey): string {
  if (key === "user") return `${item.nom ?? ""} ${item.prenom ?? ""}`.trim().toLowerCase()
  if (key === "status") return item.kitInstalled ? "1" : "0"
  return item.kitPurchasedAt
}

function sorted(list: KitUser[], key: SortKey, dir: SortDir): KitUser[] {
  return [...list].sort((a, b) => {
    const cmp = sortValue(a, key).localeCompare(sortValue(b, key), "fr", { sensitivity: "base" })
    return dir === "asc" ? cmp : -cmp
  })
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-gray-700">{dir === "asc" ? "↑" : "↓"}</span>
}

export default function KitInstallationsPage() {
  const { data, loading, error, refetch } = useDataList<KitUser>("/api/kit-installations")
  const [sortKey, setSortKey] = useState<SortKey>("kitPurchasedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [search, setSearch] = useState("")
  const [toggling, setToggling] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

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

  async function handleToggle(item: KitUser) {
    setToggling(item.id)
    try {
      await fetch(`/api/kit-installations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kitInstalled: !item.kitInstalled }),
      })
      refetch()
      window.dispatchEvent(new CustomEvent("kit-status-changed"))
    } finally {
      setToggling(null)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/kit-installations", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setSyncResult(
          data.synced > 0
            ? `${data.synced} achat${data.synced > 1 ? "s" : ""} synchronisé${data.synced > 1 ? "s" : ""}`
            : "Tout est à jour"
        )
        if (data.synced > 0) {
          refetch()
          window.dispatchEvent(new CustomEvent("kit-status-changed"))
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

  const filtered = data.filter((item) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const name = `${item.nom ?? ""} ${item.prenom ?? ""}`.toLowerCase()
    return name.includes(q) || item.email.toLowerCase().includes(q)
  })
  const rows = sorted(filtered, sortKey, sortDir)
  const isFiltering = search.trim().length > 0
  const pendingCount = data.filter((i) => !i.kitInstalled).length

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kits de démarrage</h1>
          {pendingCount > 0 && (
            <p className="text-sm mt-1" style={{ color: "#b45309" }}>
              {pendingCount} installation{pendingCount !== 1 ? "s" : ""} en attente
            </p>
          )}
        </div>
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
        </div>
      </div>

      {/* Barre de recherche + compteur */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          {isFiltering
            ? `${rows.length} résultat${rows.length !== 1 ? "s" : ""} sur ${data.length}`
            : `${data.length} kit${data.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Tableau */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th
              className={`text-left py-3 pl-3 pr-4 font-semibold cursor-pointer select-none transition-colors ${sortKey === "user" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("user")}
            >
              Utilisateur
              <SortIcon active={sortKey === "user"} dir={sortDir} />
            </th>
            <th className="text-left py-3 pr-4 font-semibold text-gray-500">
              Email
            </th>
            <th
              className={`text-left py-3 pr-4 font-semibold w-40 cursor-pointer select-none transition-colors ${sortKey === "kitPurchasedAt" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("kitPurchasedAt")}
            >
              Date d&apos;achat
              <SortIcon active={sortKey === "kitPurchasedAt"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-4 font-semibold w-52 cursor-pointer select-none transition-colors ${sortKey === "status" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("status")}
            >
              Statut
              <SortIcon active={sortKey === "status"} dir={sortDir} />
            </th>
            <th className="text-left py-3 pr-3 font-semibold w-40 text-gray-500">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 pl-3 pr-4 text-gray-800 font-medium">
                {item.nom || item.prenom
                  ? `${item.nom ?? ""} ${item.prenom ?? ""}`.trim()
                  : "—"}
              </td>
              <td className="py-3 pr-4 text-gray-600">
                {item.email}
              </td>
              <td className="py-3 pr-4 text-gray-500">
                {new Date(item.kitPurchasedAt).toLocaleDateString("fr-FR")}
              </td>
              <td className="py-3 pr-4">
                {item.kitInstalled ? (
                  <span
                    className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={{ backgroundColor: "#d1fae5", borderColor: "#10b981", color: "#065f46" }}
                  >
                    Installation effectuée
                  </span>
                ) : (
                  <span
                    className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b", color: "#b45309" }}
                  >
                    Installation à effectuer
                  </span>
                )}
              </td>
              <td className="py-3 pr-3">
                <button
                  onClick={() => handleToggle(item)}
                  disabled={toggling === item.id}
                  className={`text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                    item.kitInstalled
                      ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {toggling === item.id
                    ? "…"
                    : item.kitInstalled
                      ? "Annuler"
                      : "Marquer installé"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-8">
          {isFiltering
            ? `Aucun résultat pour « ${search.trim()} »`
            : "Aucun kit acheté pour le moment."}
        </p>
      )}
    </div>
  )
}
