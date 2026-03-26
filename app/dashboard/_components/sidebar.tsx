"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/dashboard/exercices", label: "Exercices" },
  { href: "/dashboard/audio-files", label: "Fichiers audio" },
  { href: "/dashboard/users", label: "Utilisateurs" },
  { href: "/dashboard/pages", label: "Pages Web" },
  { href: "/dashboard/admin-users", label: "Administrateurs" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [kitPendingCount, setKitPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchKitCount() {
      try {
        const res = await fetch("/api/kit-installations")
        if (!res.ok) return
        const users: { kitInstalled: boolean }[] = await res.json()
        if (!cancelled) {
          setKitPendingCount(users.filter((u) => !u.kitInstalled).length)
        }
      } catch {
        // silently ignore
      }
    }
    fetchKitCount()
    // Refresh on window focus
    const onFocus = () => fetchKitCount()
    window.addEventListener("focus", onFocus)
    return () => { cancelled = true; window.removeEventListener("focus", onFocus) }
  }, [])

  return (
    <nav className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col p-4 gap-1 shrink-0">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
        const showBadge = item.href === "/dashboard/users" && kitPendingCount > 0

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-between ${
              isActive
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.label}
            {showBadge && (
              <span className="ml-auto min-w-[1.25rem] h-5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none px-1.5">
                {kitPendingCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
