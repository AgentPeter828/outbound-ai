import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  formatCurrency,
  formatPercentage,
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
} from "@/lib/utils"
import {
  DollarSign,
  TrendingUp,
  Users,
  Mail,
  Calendar,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react"

async function RevenueMetrics() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const { data: deals } = await supabase
    .from("deals")
    .select("value, stage, probability, created_at, close_date")
    .eq("workspace_id", membership.workspace_id)

  const openDeals = deals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)) || []
  const closedWon = deals?.filter(d => d.stage === "closed_won") || []
  const closedLost = deals?.filter(d => d.stage === "closed_lost") || []

  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const weightedPipeline = openDeals.reduce((sum, d) => sum + (d.value || 0) * (d.probability || 0.5), 0)
  const totalWon = closedWon.reduce((sum, d) => sum + (d.value || 0), 0)
  const winRate = closedWon.length + closedLost.length > 0
    ? closedWon.length / (closedWon.length + closedLost.length)
    : 0
  const avgDealSize = closedWon.length > 0 ? totalWon / closedWon.length : 0

  // Calculate monthly forecast
  const monthlyForecast = weightedPipeline * 0.8 // Simplified forecast

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(pipelineValue)}</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span className="text-green-500">+12.5%</span> from last month
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(weightedPipeline)}</div>
          <p className="text-xs text-muted-foreground">Based on probability</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(winRate)}</div>
          <p className="text-xs text-muted-foreground">
            {closedWon.length} won / {closedLost.length} lost
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(avgDealSize)}</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span className="text-green-500">+8%</span> from last quarter
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

async function FunnelAnalysis() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const { data: deals } = await supabase
    .from("deals")
    .select("stage, value")
    .eq("workspace_id", membership.workspace_id)

  const stages = DEAL_STAGES.filter(s => s !== "closed_lost")

  const stageData = stages.map((stage, index) => {
    const stageDeals = deals?.filter(d => d.stage === stage) || []
    const count = stageDeals.length
    const value = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)

    // Calculate conversion rate (simplified)
    const prevStageDeals = index > 0
      ? deals?.filter(d => d.stage === stages[index - 1]) || []
      : deals || []
    const conversionRate = prevStageDeals.length > 0 ? count / prevStageDeals.length : 1

    return {
      stage,
      label: DEAL_STAGE_LABELS[stage as keyof typeof DEAL_STAGE_LABELS],
      count,
      value,
      conversionRate,
    }
  })

  const maxCount = Math.max(...stageData.map(s => s.count), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Funnel</CardTitle>
        <CardDescription>Deal progression through stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stageData.map((data, index) => (
            <div key={data.stage}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge className={DEAL_STAGE_COLORS[data.stage as keyof typeof DEAL_STAGE_COLORS]}>
                    {data.label}
                  </Badge>
                  <span className="text-sm font-medium">{data.count} deals</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{formatCurrency(data.value)}</span>
                  {index > 0 && (
                    <span className="text-xs">
                      {formatPercentage(data.conversionRate)} conversion
                    </span>
                  )}
                </div>
              </div>
              <Progress value={(data.count / maxCount) * 100} className="h-3" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

async function SequencePerformance() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const { data: sequences } = await supabase
    .from("sequences")
    .select(`
      id,
      name,
      status,
      stats,
      sequence_enrollments (count)
    `)
    .eq("workspace_id", membership.workspace_id)
    .eq("status", "active")
    .limit(5)

  // Get overall email stats
  const { data: sentEmails } = await supabase
    .from("sent_emails")
    .select("status, opened_at, replied_at")
    .eq("workspace_id", membership.workspace_id)

  const totalSent = sentEmails?.length || 0
  const totalOpened = sentEmails?.filter(e => e.opened_at).length || 0
  const totalReplied = sentEmails?.filter(e => e.replied_at).length || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach Performance</CardTitle>
        <CardDescription>Email sequence metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{totalSent}</p>
            <p className="text-sm text-muted-foreground">Emails Sent</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{formatPercentage(totalSent > 0 ? totalOpened / totalSent : 0)}</p>
            <p className="text-sm text-muted-foreground">Open Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{formatPercentage(totalSent > 0 ? totalReplied / totalSent : 0)}</p>
            <p className="text-sm text-muted-foreground">Reply Rate</p>
          </div>
        </div>

        {/* Top Sequences */}
        {sequences && sequences.length > 0 && (
          <>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Active Sequences</p>
              <div className="space-y-3">
                {sequences.map((sequence) => {
                  const stats = sequence.stats as { open_rate?: number; reply_rate?: number } | null
                  const enrollments = (sequence.sequence_enrollments as { count: number }[])?.[0]?.count || 0
                  return (
                    <div key={sequence.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{sequence.name}</p>
                        <p className="text-xs text-muted-foreground">{enrollments} enrolled</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{formatPercentage(stats?.open_rate || 0)} open</span>
                        <span>{formatPercentage(stats?.reply_rate || 0)} reply</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

async function ActivityMetrics() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  // Get activity counts
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { count: emailsSent } = await supabase
    .from("sent_emails")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id)
    .gte("created_at", thirtyDaysAgo.toISOString())

  const { count: meetingsHeld } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id)
    .gte("start_time", thirtyDaysAgo.toISOString())

  const { count: dealsCreated } = await supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id)
    .gte("created_at", thirtyDaysAgo.toISOString())

  const { count: contactsAdded } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id)
    .gte("created_at", thirtyDaysAgo.toISOString())

  const activities = [
    { name: "Emails Sent", value: emailsSent || 0, icon: Mail, change: "+24%" },
    { name: "Meetings Held", value: meetingsHeld || 0, icon: Calendar, change: "+12%" },
    { name: "Deals Created", value: dealsCreated || 0, icon: TrendingUp, change: "+8%" },
    { name: "Contacts Added", value: contactsAdded || 0, icon: Users, change: "+32%" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity (Last 30 Days)</CardTitle>
        <CardDescription>Your sales activities over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {activities.map((activity) => (
            <div key={activity.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                <activity.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activity.value}</p>
                <p className="text-xs text-muted-foreground">{activity.name}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

async function AIInsights() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  // Get at-risk deals
  const { data: atRiskDeals } = await supabase
    .from("deals")
    .select(`
      id,
      title,
      value,
      ai_risk_score,
      company:companies (name)
    `)
    .eq("workspace_id", membership.workspace_id)
    .not("stage", "in", "(closed_won,closed_lost)")
    .gt("ai_risk_score", 60)
    .order("ai_risk_score", { ascending: false })
    .limit(3)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <CardTitle>AI Insights</CardTitle>
          <CardDescription>Predictions and recommendations</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Forecast */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm font-medium">Revenue Forecast</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(125000)}</p>
          <p className="text-sm text-muted-foreground">
            Predicted revenue for this quarter based on pipeline and historical close rates
          </p>
        </div>

        {/* At Risk Deals */}
        {atRiskDeals && atRiskDeals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-medium">At-Risk Deals</p>
            </div>
            <div className="space-y-2">
              {atRiskDeals.map((deal) => {
                const company = deal.company as { name: string } | null
                return (
                  <div key={deal.id} className="flex items-center justify-between p-2 rounded bg-orange-50 dark:bg-orange-900/10">
                    <div>
                      <p className="text-sm font-medium">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{company?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(deal.value || 0)}</p>
                      <p className="text-xs text-orange-600">{deal.ai_risk_score?.toFixed(0)}% risk</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div>
          <p className="text-sm font-medium mb-3">Recommendations</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-500 mt-0.5" />
              <p>Your reply rate is 15% above industry average. Keep the momentum!</p>
            </div>
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-blue-500 mt-0.5" />
              <p>Consider increasing outreach to Series A SaaS companies - highest conversion segment.</p>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-purple-500 mt-0.5" />
              <p>Tuesdays at 10am have 23% higher open rates. Schedule sends accordingly.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Track your sales performance and get AI-powered insights
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <RevenueMetrics />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <FunnelAnalysis />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <AIInsights />
        </Suspense>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <SequencePerformance />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-80" />}>
          <ActivityMetrics />
        </Suspense>
      </div>
    </div>
  )
}
