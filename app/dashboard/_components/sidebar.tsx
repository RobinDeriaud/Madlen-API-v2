"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/dashboard/exercices", label: "Exercices" },
  { href: "/dashboard/users", label: "Utilisateurs" },
  { href: "/dashboard/pages", label: "Pages Web" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col p-4 gap-1 shrink-0">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
