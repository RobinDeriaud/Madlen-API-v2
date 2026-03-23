"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { MacroBadge, MACRO_CONFIG } from "@/lib/macro"
import { useDataList } from "@/lib/hooks/use-data-list"

type Exercice = {
  id: number
  macro: string | null
  numero: number | null
  nom: string | null
  version: string | null
  updatedAt: string | null
  publishedAt: string | null
}

type SortKey = "numero" | "macro" | "nom" | "version" | "updatedAt"
type SortDir = "asc" | "desc"
type PublishFilter = "ALL" | "PUBLISHED" | "DRAFT"

function sorted(list: Exercice[], key: SortKey, dir: SortDir): Exercice[] {
  return [...list].sort((a, b) => {
    const av = a[key] ?? ""
    const bv = b[key] ?? ""
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "fr", { sensitivity: "base" })
    return dir === "asc" ? cmp : -cmp
  })
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-gray-700">{dir === "asc" ? "↑" : "↓"}</span>
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function ExercicesPage() {
  const router = useRouter()
  const { data: exercices, loading, error, refetch } = useDataList<Exercice>("/api/exercices")
  const [sortKey, setSortKey] = useState<SortKey>("numero")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [search, setSearch] = useState("")
  const [macroFilter, setMacroFilter] = useState<string | "ALL">("ALL")
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("ALL")
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Refetch quand la page redevient visible (retour depuis une page détail)
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

  async function togglePublish(ex: Exercice, e: React.MouseEvent) {
    e.stopPropagation()
    setTogglingId(ex.id)
    try {
      await fetch(`/api/exercices/${ex.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !ex.publishedAt }),
      })
      refetch()
    } finally {
      setTogglingId(null)
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

  const filtered = exercices
    .filter((ex) => macroFilter === "ALL" || ex.macro === macroFilter)
    .filter((ex) => {
      if (publishFilter === "PUBLISHED") return ex.publishedAt !== null
      if (publishFilter === "DRAFT") return ex.publishedAt === null
      return true
    })
    .filter((ex) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        String(ex.numero ?? "").includes(q) ||
        (ex.nom ?? "").toLowerCase().includes(q)
      )
    })
  const rows = sorted(filtered, sortKey, sortDir)
  const isFiltering = search.trim().length > 0 || macroFilter !== "ALL" || publishFilter !== "ALL"

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exercices</h1>
        <Link
          href="/dashboard/exercices/nouveau"
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
        >
          + Nouvel exercice
        </Link>
      </div>

      {/* Filtres par macro */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setMacroFilter("ALL")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            macroFilter === "ALL"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
          }`}
        >
          Toutes
        </button>
        {Object.entries(MACRO_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setMacroFilter(key)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
            style={
              macroFilter === key
                ? { backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }
                : { backgroundColor: "#fff", borderColor: "#D1D5DB", color: "#4B5563" }
            }
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Filtre publication */}
      <div className="flex gap-2 mb-4">
        {([
          ["ALL", "Tous"],
          ["PUBLISHED", "Publiés"],
          ["DRAFT", "Brouillons"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setPublishFilter(value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              publishFilter === value
                ? value === "PUBLISHED"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : value === "DRAFT"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Barre de recherche + compteur */}
      <div className="mb-5">
        <input
          type="search"
          placeholder="Rechercher par numéro ou titre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          {isFiltering
            ? `${rows.length} résultat${rows.length !== 1 ? "s" : ""} sur ${exercices.length}`
            : `${exercices.length} exercice${exercices.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Tableau */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th
              className={`text-right py-3 pr-6 pl-3 font-semibold w-20 cursor-pointer select-none transition-colors ${sortKey === "numero" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("numero")}
            >
              N°
              <SortIcon active={sortKey === "numero"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-6 font-semibold w-48 cursor-pointer select-none transition-colors ${sortKey === "macro" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("macro")}
            >
              Macro
              <SortIcon active={sortKey === "macro"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-6 font-semibold cursor-pointer select-none transition-colors ${sortKey === "nom" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("nom")}
            >
              Titre
              <SortIcon active={sortKey === "nom"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-6 font-semibold w-20 cursor-pointer select-none transition-colors ${sortKey === "version" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("version")}
            >
              Version
              <SortIcon active={sortKey === "version"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 pr-6 font-semibold w-32 cursor-pointer select-none transition-colors ${sortKey === "updatedAt" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("updatedAt")}
            >
              Modifié
              <SortIcon active={sortKey === "updatedAt"} dir={sortDir} />
            </th>
            <th className="text-center py-3 font-semibold w-24">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((ex) => (
            <tr
              key={ex.id}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={() => router.push(`/dashboard/exercices/${ex.id}`)}
            >
              <td className="py-3 pr-6 pl-3 text-right text-gray-400 tabular-nums font-mono text-xs">
                {ex.numero ?? "—"}
              </td>
              <td className="py-3 pr-6">
                {ex.macro ? <MacroBadge macro={ex.macro} /> : <span className="text-gray-200">—</span>}
              </td>
              <td className="py-3 pr-6 text-gray-800 group-hover:text-gray-900 group-hover:underline underline-offset-2">
                {ex.nom ?? <span className="text-gray-300 no-underline">—</span>}
              </td>
              <td className="py-3 pr-6 text-gray-500 text-xs tabular-nums">
                {ex.version ?? "—"}
              </td>
              <td className="py-3 pr-6 text-gray-400 text-xs tabular-nums">
                {formatDate(ex.updatedAt)}
              </td>
              <td className="py-3 text-center">
                <button
                  onClick={(e) => togglePublish(ex, e)}
                  disabled={togglingId === ex.id}
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    ex.publishedAt
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  } ${togglingId === ex.id ? "opacity-50 cursor-wait" : ""}`}
                >
                  {ex.publishedAt ? "Publié" : "Brouillon"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-8">
          {isFiltering ? `Aucun résultat pour « ${search.trim()} »` : "Aucun exercice trouvé."}
        </p>
      )}
    </div>
  )
}
