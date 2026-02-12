import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Target,
  Sparkles,
  Building2,
  Users,
  TrendingUp,
  ArrowRight,
  Filter,
} from "lucide-react"

export default async function ProspectsPage() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(icp_config)")
    .single()

  if (!membership) return null

  // Get ICP presets
  const { data: presets } = await supabase
    .from("icp_presets")
    .select("*")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false })

  // Get workspace ICP config
  const workspace = membership.workspaces as { icp_config: Record<string, unknown> } | null
  const hasIcp = workspace?.icp_config && Object.keys(workspace.icp_config).length > 0

  // Get stats
  const [
    { count: totalCompanies },
    { count: highFitCompanies },
    { count: totalContacts },
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).gte("fit_score", 70),
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prospects</h1>
          <p className="text-muted-foreground">
            Build your Total Addressable Market and find your ideal customers
          </p>
        </div>
        <Button asChild>
          <Link href="/prospects/discover">
            <Search className="mr-2 h-4 w-4" />
            Discover Prospects
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TAM</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies || 0}</div>
            <p className="text-xs text-muted-foreground">companies in database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Fit</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highFitCompanies || 0}</div>
            <p className="text-xs text-muted-foreground">score 70+</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts || 0}</div>
            <p className="text-xs text-muted-foreground">total contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ICP Status</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasIcp ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="secondary">Not Set</Badge>
              )}
            </div>
            <Link href="/prospects/icp" className="text-xs text-primary hover:underline">
              {hasIcp ? "Edit ICP" : "Define ICP"}
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start building your pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/prospects/icp"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Define Your ICP</p>
                  <p className="text-sm text-muted-foreground">
                    Set your ideal customer profile criteria
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Link>

            <Link
              href="/prospects/discover"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Discover Prospects</p>
                  <p className="text-sm text-muted-foreground">
                    Search and import companies matching your ICP
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Link>

            <Link
              href="/accounts"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">View All Accounts</p>
                  <p className="text-sm text-muted-foreground">
                    See your full TAM ranked by fit score
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Saved ICP Presets */}
        <Card>
          <CardHeader>
            <CardTitle>Saved ICP Presets</CardTitle>
            <CardDescription>Quick filters for different segments</CardDescription>
          </CardHeader>
          <CardContent>
            {presets?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Filter className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-center">
                  No presets saved yet
                </p>
                <Button size="sm" variant="outline" className="mt-4" asChild>
                  <Link href="/prospects/icp">Create Preset</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {presets?.map((preset) => {
                  const filters = preset.filters as Record<string, unknown>
                  return (
                    <Link
                      key={preset.id}
                      href={`/prospects/discover?preset=${preset.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{preset.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {filters.targetIndustries && (
                            <Badge variant="outline" className="text-xs">
                              {(filters.targetIndustries as string[]).length} industries
                            </Badge>
                          )}
                          {filters.minEmployees && (
                            <Badge variant="outline" className="text-xs">
                              {filters.minEmployees}+ employees
                            </Badge>
                          )}
                          {filters.targetFundingStages && (
                            <Badge variant="outline" className="text-xs">
                              {(filters.targetFundingStages as string[]).length} stages
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>Recommendations for your prospecting</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <p className="font-medium">Top Converting Industry</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Based on your closed deals, SaaS companies convert 2.3x better.
                Consider focusing your outreach here.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-500" />
                <p className="font-medium">Optimal Company Size</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Companies with 51-200 employees have the highest response rates
                for your sequences.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-500" />
                <p className="font-medium">Best Entry Point</p>
              </div>
              <p className="text-sm text-muted-foreground">
                VP-level contacts have 45% higher reply rates than C-suite
                for initial outreach.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
