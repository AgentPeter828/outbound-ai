import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatRelativeTime, DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from "@/lib/utils"
import {
  DollarSign,
  Users,
  Building2,
  Mail,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Flame,
} from "lucide-react"
import Link from "next/link"

interface PageProps {
  searchParams: Promise<{ business?: string }>
}

async function BusinessContext({ businessSlug }: { businessSlug: string }) {
  const supabase = await createClient()

  // Try to fetch business info from the shared businesses table
  const { data: business } = await supabase
    .from("businesses")
    .select("name, description, slug")
    .eq("slug", businessSlug)
    .single()

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
          <Flame className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <p className="text-sm text-violet-600 font-medium">Firestorm Business</p>
          <h2 className="text-lg font-bold text-violet-900">
            {business?.name || businessSlug}
          </h2>
          {business?.description && (
            <p className="text-sm text-violet-700/70 mt-0.5 line-clamp-1">{business.description}</p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" asChild className="border-violet-200 text-violet-700 hover:bg-violet-100">
        <Link href={`http://localhost:3000/portfolio/${businessSlug}`}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Firestorm
        </Link>
      </Button>
    </div>
  )
}

async function DashboardStats({ businessSlug }: { businessSlug?: string }) {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const workspaceId = membership.workspace_id

  // Build queries with optional business filtering
  let companiesQuery = supabase.from("companies").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId)
  let contactsQuery = supabase.from("contacts").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId)
  let dealsQuery = supabase.from("deals").select("value, stage").eq("workspace_id", workspaceId).not("stage", "eq", "closed_lost")
  let sequencesQuery = supabase.from("sequences").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active")

  // If business context, also show outbound-specific stats
  if (businessSlug) {
    const [
      { count: prospectsCount },
      { data: emails },
      { count: meetingsCount },
      { data: deals },
    ] = await Promise.all([
      supabase.from("outbound_prospects").select("*", { count: "exact", head: true }).eq("business_slug", businessSlug),
      supabase.from("outbound_emails").select("status, replied").eq("business_slug", businessSlug),
      supabase.from("outbound_meetings").select("*", { count: "exact", head: true }).eq("business_slug", businessSlug),
      supabase.from("outbound_deals").select("value, stage").eq("business_slug", businessSlug),
    ])

    const emailsSent = emails?.filter(e => e.status === "sent" || e.status === "delivered").length || 0
    const repliedCount = emails?.filter(e => e.replied).length || 0
    const pipelineVal = deals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).reduce((s, d) => s + (d.value || 0), 0) || 0

    const stats = [
      { name: "Prospects", value: (prospectsCount || 0).toString(), icon: Users, change: "", changeType: "positive" as const },
      { name: "Emails Sent", value: emailsSent.toString(), icon: Mail, change: "", changeType: "positive" as const },
      { name: "Reply Rate", value: emailsSent > 0 ? `${((repliedCount / emailsSent) * 100).toFixed(1)}%` : "0%", icon: TrendingUp, change: "", changeType: "positive" as const },
      { name: "Pipeline Value", value: formatCurrency(pipelineVal), icon: DollarSign, change: "", changeType: "positive" as const },
    ]

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Default workspace-wide stats
  const [
    { count: companiesCount },
    { count: contactsCount },
    { data: deals },
    { count: activeSequences },
  ] = await Promise.all([companiesQuery, contactsQuery, dealsQuery, sequencesQuery])

  const pipelineValue = deals?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0
  const openDeals = deals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).length || 0

  const stats = [
    { name: "Pipeline Value", value: formatCurrency(pipelineValue), change: "+12.5%", changeType: "positive" as const, icon: DollarSign },
    { name: "Open Deals", value: openDeals.toString(), change: "+4.3%", changeType: "positive" as const, icon: TrendingUp },
    { name: "Companies", value: (companiesCount || 0).toString(), change: "+8.2%", changeType: "positive" as const, icon: Building2 },
    { name: "Contacts", value: (contactsCount || 0).toString(), change: "+15.1%", changeType: "positive" as const, icon: Users },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {stat.changeType === "positive" ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={stat.changeType === "positive" ? "text-green-500" : "text-red-500"}>
                  {stat.change}
                </span>
                from last month
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function RecentActivity() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const { data: interactions } = await supabase
    .from("interactions")
    .select(`
      id,
      type,
      subject,
      created_at,
      contacts (
        id,
        first_name,
        last_name,
        company:companies (name)
      )
    `)
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false })
    .limit(5)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "email_sent":
      case "email_received":
        return Mail
      case "meeting":
        return Calendar
      default:
        return TrendingUp
    }
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest interactions across your pipeline</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {interactions?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity. Start by adding contacts to a sequence.
            </p>
          )}
          {interactions?.map((interaction) => {
            const Icon = getActivityIcon(interaction.type)
            const contact = interaction.contacts as { first_name: string; last_name: string; company: { name: string } | null } | null
            return (
              <div key={interaction.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">
                      {contact ? `${contact.first_name} ${contact.last_name}` : "Unknown"}
                    </span>
                    {contact?.company && (
                      <span className="text-muted-foreground"> at {contact.company.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {interaction.subject || interaction.type.replace(/_/g, " ")} • {formatRelativeTime(interaction.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

async function ActiveDeals() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const { data: deals } = await supabase
    .from("deals")
    .select(`
      id,
      title,
      value,
      stage,
      probability,
      ai_next_action,
      ai_risk_score,
      companies (name),
      contacts (first_name, last_name)
    `)
    .eq("workspace_id", membership.workspace_id)
    .not("stage", "in", "(closed_won,closed_lost)")
    .order("value", { ascending: false })
    .limit(5)

  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Active Deals</CardTitle>
          <CardDescription>Your top opportunities by value</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/pipeline">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deals?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active deals. Import prospects to get started.
            </p>
          )}
          {deals?.map((deal) => {
            const company = deal.companies as { name: string } | null
            return (
              <Link
                key={deal.id}
                href={`/pipeline/${deal.id}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{deal.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{company?.name}</span>
                    <Badge className={DEAL_STAGE_COLORS[deal.stage as keyof typeof DEAL_STAGE_COLORS]}>
                      {DEAL_STAGE_LABELS[deal.stage as keyof typeof DEAL_STAGE_LABELS]}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(deal.value || 0)}</p>
                  {deal.ai_risk_score && deal.ai_risk_score > 60 && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs">At risk</span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

async function AIRecommendations() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const { data: deals } = await supabase
    .from("deals")
    .select(`
      id,
      title,
      ai_next_action,
      companies (name)
    `)
    .eq("workspace_id", membership.workspace_id)
    .not("ai_next_action", "is", null)
    .limit(4)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <CardTitle>AI Recommendations</CardTitle>
          <CardDescription>Suggested next actions for your deals</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deals?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              AI recommendations will appear as you work on deals.
            </p>
          )}
          {deals?.map((deal) => {
            const company = deal.companies as { name: string } | null
            return (
              <div key={deal.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">{company?.name}</p>
                  <p className="text-sm mt-1">{deal.ai_next_action}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/pipeline/${deal.id}`}>View</Link>
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const businessSlug = params.business

  return (
    <div className="space-y-6">
      {businessSlug && (
        <Suspense fallback={<Skeleton className="h-20" />}>
          <BusinessContext businessSlug={businessSlug} />
        </Suspense>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {businessSlug ? "Sales Dashboard" : "Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          {businessSlug
            ? `Outbound sales metrics for ${businessSlug}`
            : "Welcome back! Here's what's happening with your pipeline."}
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats businessSlug={businessSlug} />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <ActiveDeals />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <RecentActivity />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-64" />}>
        <AIRecommendations />
      </Suspense>
    </div>
  )
}
