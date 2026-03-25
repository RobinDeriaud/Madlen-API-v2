"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

const navItems = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/dashboard/exercices", label: "Exercices" },
  { href: "/dashboard/audio-files", label: "Fichiers audio" },
  { href: "/dashboard/users", label: "Utilisateurs" },
  { href: "/dashboard/kit-installations", label: "Kits de démarrage" },
  { href: "/dashboard/pages", label: "Pages Web" },
  { href: "/dashboard/admin-users", label: "Administrateurs" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [kitPendingCount, setKitPendingCount] = useState(0)

  const fetchKitCount = useCallback(() => {
    fetch("/api/kit-installations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { kitInstalled: boolean }[]) => {
        setKitPendingCount(data.filter((d) => !d.kitInstalled).length)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchKitCount()
    const onFocus = () => fetchKitCount()
    const onKitChange = () => fetchKitCount()
    window.addEventListener("focus", onFocus)
    window.addEventListener("kit-status-changed", onKitChange)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("kit-status-changed", onKitChange)
    }
  }, [fetchKitCount])

  return (
    <nav className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col p-4 gap-1 shrink-0">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-between ${
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {item.label}
          {item.href === "/dashboard/kit-installations" && kitPendingCount > 0 && (
            <span
              className="inline-flex items-center justify-center text-xs font-bold min-w-5 h-5 px-1.5 rounded-full"
              style={{ backgroundColor: "#f59e0b", color: "#fff" }}
            >
              {kitPendingCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
