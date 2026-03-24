"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useDataList } from "@/lib/hooks/use-data-list"

type PageWeb = {
  id: number
  nom: string | null
  slug: string | null
  updatedAt: string | null
  publishedAt: string | null
}

type SortKey = "nom" | "slug" | "updatedAt"
type SortDir = "asc" | "desc"
type PublishFilter = "ALL" | "PUBLISHED" | "DRAFT"

function sorted(list: PageWeb[], key: SortKey, dir: SortDir): PageWeb[] {
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

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function PagesListPage() {
  const router = useRouter()
  const { data: pages, loading, error, refetch } = useDataList<PageWeb>("/api/pages")
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [search, setSearch] = useState("")
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("ALL")
  const [togglingId, setTogglingId] = useState<number | null>(null)

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

  async function togglePublish(page: PageWeb, e: React.MouseEvent) {
    e.stopPropagation()
    setTogglingId(page.id)
    try {
      await fetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !page.publishedAt }),
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

  const filtered = pages
    .filter((p) => {
      if (publishFilter === "PUBLISHED") return p.publishedAt !== null
      if (publishFilter === "DRAFT") return p.publishedAt === null
      return true
    })
    .filter((p) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        (p.nom ?? "").toLowerCase().includes(q) ||
        (p.slug ?? "").toLowerCase().includes(q)
      )
    })
  const rows = sorted(filtered, sortKey, sortDir)
  const isFiltering = search.trim().length > 0 || publishFilter !== "ALL"

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pages Web</h1>
        <Link
          href="/dashboard/pages/nouveau"
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
        >
          + Nouvelle page
        </Link>
      </div>

      {/* Publication filter */}
      <div className="flex gap-2 mb-4">
        {([
          ["ALL", "Toutes"],
          ["PUBLISHED", "Publiées"],
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

      {/* Search */}
      <div className="mb-5">
        <input
          type="search"
          placeholder="Rechercher par nom ou slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          {isFiltering
            ? `${rows.length} résultat${rows.length !== 1 ? "s" : ""} sur ${pages.length}`
            : `${pages.length} page${pages.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th
              className={`text-left py-3 px-3 font-semibold cursor-pointer select-none transition-colors ${sortKey === "nom" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("nom")}
            >
              Nom
              <SortIcon active={sortKey === "nom"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 px-3 font-semibold w-48 cursor-pointer select-none transition-colors ${sortKey === "slug" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("slug")}
            >
              Slug
              <SortIcon active={sortKey === "slug"} dir={sortDir} />
            </th>
            <th
              className={`text-left py-3 px-3 font-semibold w-32 cursor-pointer select-none transition-colors ${sortKey === "updatedAt" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
              onClick={() => handleSort("updatedAt")}
            >
              Modifié
              <SortIcon active={sortKey === "updatedAt"} dir={sortDir} />
            </th>
            <th className="text-center py-3 font-semibold w-24">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={() => router.push(`/dashboard/pages/${p.id}`)}
            >
              <td className="py-3 px-3 text-gray-800 group-hover:text-gray-900 group-hover:underline underline-offset-2">
                {p.nom ?? <span className="text-gray-300">—</span>}
              </td>
              <td className="py-3 px-3 text-gray-500 text-xs font-mono">
                {p.slug ?? "—"}
              </td>
              <td className="py-3 px-3 text-gray-400 text-xs tabular-nums">
                {formatDate(p.updatedAt)}
              </td>
              <td className="py-3 text-center">
                <button
                  onClick={(e) => togglePublish(p, e)}
                  disabled={togglingId === p.id}
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    p.publishedAt
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  } ${togglingId === p.id ? "opacity-50 cursor-wait" : ""}`}
                >
                  {p.publishedAt ? "Publié" : "Brouillon"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-8">
          {isFiltering ? `Aucun résultat pour « ${search.trim()} »` : "Aucune page trouvée."}
        </p>
      )}
    </div>
  )
}
