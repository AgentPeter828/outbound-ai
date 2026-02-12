import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/layout/app-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user's workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    redirect("/onboard")
  }

  return (
    <AppShell
      user={{
        email: user.email || "",
        name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
      }}
    >
      {children}
    </AppShell>
  )
}
