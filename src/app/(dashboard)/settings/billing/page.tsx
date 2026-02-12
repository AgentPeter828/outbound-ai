import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  CreditCard,
  Zap,
  CheckCircle,
  ArrowUpRight,
  BarChart3,
} from "lucide-react"

const PLANS = [
  {
    name: "Starter",
    price: 149,
    credits: 1000,
    features: [
      "1,000 AI credits/month",
      "Up to 3 team members",
      "Email sending",
      "Basic analytics",
      "Standard support",
    ],
  },
  {
    name: "Growth",
    price: 349,
    credits: 5000,
    popular: true,
    features: [
      "5,000 AI credits/month",
      "Up to 10 team members",
      "Email + meeting intelligence",
      "Advanced analytics",
      "Priority support",
      "Custom sequences",
    ],
  },
  {
    name: "Enterprise",
    price: null,
    credits: null,
    features: [
      "Unlimited AI credits",
      "Unlimited team members",
      "All features",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
]

async function CurrentPlan() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces (*)")
    .eq("user_id", user.id)
    .single()

  if (!membership) return null

  const workspace = membership.workspaces as {
    id: string
    plan: string
    plan_status: string
    credits_used: number
    credits_included: number
    current_period_end: string
  }

  const creditsUsed = workspace.credits_used || 0
  const creditsIncluded = workspace.credits_included || 1000
  const creditsPercent = Math.min((creditsUsed / creditsIncluded) * 100, 100)
  const periodEnd = workspace.current_period_end
    ? new Date(workspace.current_period_end)
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              Manage your subscription and billing
            </CardDescription>
          </div>
          <Badge
            variant={workspace.plan_status === "active" ? "default" : "secondary"}
            className="capitalize"
          >
            {workspace.plan_status || "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold capitalize">
              {workspace.plan || "Starter"} Plan
            </p>
            <p className="text-muted-foreground">
              {periodEnd ? (
                <>Renews on {periodEnd.toLocaleDateString()}</>
              ) : (
                <>No active subscription</>
              )}
            </p>
          </div>
          <form action="/api/billing/portal" method="POST">
            <Button variant="outline">
              Manage Subscription
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Credits Used</span>
            <span className="font-medium">
              {creditsUsed.toLocaleString()} / {creditsIncluded.toLocaleString()}
            </span>
          </div>
          <Progress value={creditsPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {(creditsIncluded - creditsUsed).toLocaleString()} credits remaining this period
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

async function UsageBreakdown() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single()

  if (!membership) return null

  // Get usage for current period
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: usageRecords } = await supabase
    .from("usage_records")
    .select("type, quantity")
    .eq("workspace_id", membership.workspace_id)
    .gte("created_at", startOfMonth.toISOString())

  const usageByType = (usageRecords || []).reduce((acc, record) => {
    acc[record.type] = (acc[record.type] || 0) + record.quantity
    return acc
  }, {} as Record<string, number>)

  const usageItems = [
    { label: "Emails Sent", key: "email_sent", icon: "📧" },
    { label: "AI Generations", key: "ai_generation", icon: "✨" },
    { label: "Enrichments", key: "enrichment", icon: "🔍" },
    { label: "Classifications", key: "ai_classification", icon: "🏷️" },
    { label: "Meeting Transcriptions", key: "meeting_transcription", icon: "🎙️" },
    { label: "Prospect Searches", key: "prospect_search", icon: "👥" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage Breakdown
        </CardTitle>
        <CardDescription>
          Credit consumption by feature this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {usageItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="font-medium">
                {(usageByType[item.key] || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and usage
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <CurrentPlan />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-64" />}>
          <UsageBreakdown />
        </Suspense>
      </div>

      {/* Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-lg border p-6 ${
                  plan.popular ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.price !== null ? (
                    <div className="mt-2">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <span className="text-xl font-bold">Custom</span>
                    </div>
                  )}
                  {plan.credits && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.credits.toLocaleString()} credits/month
                    </p>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.price !== null ? "Upgrade" : "Contact Sales"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Credit Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Need More Credits?
          </CardTitle>
          <CardDescription>
            Purchase additional credits anytime
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { credits: 500, price: 25 },
              { credits: 1000, price: 45 },
              { credits: 2500, price: 99 },
            ].map((addon) => (
              <div
                key={addon.credits}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {addon.credits.toLocaleString()} credits
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${(addon.price / addon.credits * 100).toFixed(1)}¢ per credit
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  ${addon.price}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
