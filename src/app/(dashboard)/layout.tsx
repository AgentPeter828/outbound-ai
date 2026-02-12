import { AppShell } from "@/components/layout/app-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // No auth required — internal Firestorm tool
  return (
    <AppShell
      user={{
        email: "admin@firestorm.dev",
        name: "Firestorm",
      }}
    >
      {children}
    </AppShell>
  )
}
