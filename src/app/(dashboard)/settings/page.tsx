import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Settings,
  Mail,
  CreditCard,
  Users,
  Plug,
  Building2,
  ChevronRight,
} from "lucide-react"

const SETTINGS_SECTIONS = [
  {
    title: "Email Settings",
    description: "Configure your email sending preferences",
    href: "/settings/email",
    icon: Mail,
  },
  {
    title: "Billing",
    description: "Manage your subscription and usage",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    title: "Team",
    description: "Invite team members and manage permissions",
    href: "/settings/team",
    icon: Users,
  },
  {
    title: "Integrations",
    description: "Connect third-party services",
    href: "/settings/integrations",
    icon: Plug,
  },
]

async function WorkspaceSettings() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces (*)")
    .eq("user_id", user.id)
    .single()

  if (!membership) return null

  const workspace = membership.workspaces as {
    id: string
    name: string
    domain: string
    plan: string
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Settings</CardTitle>
        <CardDescription>
          Manage your workspace information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace Name</Label>
          <Input
            id="workspace-name"
            defaultValue={workspace.name}
            placeholder="My Workspace"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workspace-domain">Domain</Label>
          <Input
            id="workspace-domain"
            defaultValue={workspace.domain || ""}
            placeholder="yourcompany.com"
          />
          <p className="text-xs text-muted-foreground">
            Used for branding and email verification
          </p>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Current Plan</p>
            <p className="text-sm text-muted-foreground capitalize">
              {workspace.plan || "Free"}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/settings/billing">Manage Plan</Link>
          </Button>
        </div>
        <Separator />
        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  )
}

async function ProfileSettings() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Manage your personal information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first-name">First Name</Label>
            <Input
              id="first-name"
              defaultValue={user.user_metadata?.first_name || ""}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last Name</Label>
            <Input
              id="last-name"
              defaultValue={user.user_metadata?.last_name || ""}
              placeholder="Doe"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            defaultValue={user.email || ""}
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Contact support to change your email address
          </p>
        </div>
        <Separator />
        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  )
}

export default async function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace and account settings
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {SETTINGS_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <WorkspaceSettings />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-64" />}>
          <ProfileSettings />
        </Suspense>
      </div>
    </div>
  )
}
