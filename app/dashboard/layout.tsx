import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg">Madlen Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session.user?.email}</span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="text-sm text-red-600 hover:underline"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
