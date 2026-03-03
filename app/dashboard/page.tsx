import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tableau de bord</h1>
      <p className="text-gray-600">
        Bienvenue,{" "}
        <span className="font-medium">{session?.user?.email}</span>.
      </p>
    </div>
  )
}
