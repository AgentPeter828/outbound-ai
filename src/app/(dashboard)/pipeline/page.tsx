import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  formatCurrency,
  formatDate,
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
} from "@/lib/utils"
import {
  Search,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Sparkles,
  DollarSign,
} from "lucide-react"

interface SearchParams {
  search?: string
  stage?: string
  view?: string
  page?: string
}

async function PipelineStats() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const { data: deals } = await supabase
    .from("deals")
    .select("value, stage, probability")
    .eq("workspace_id", membership.workspace_id)

  const openDeals = deals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)) || []
  const totalValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const weightedValue = openDeals.reduce((sum, d) => sum + (d.value || 0) * (d.probability || 0.5), 0)
  const closedWon = deals?.filter(d => d.stage === "closed_won") || []
  const closedLost = deals?.filter(d => d.stage === "closed_lost") || []
  const winRate = closedWon.length + closedLost.length > 0
    ? closedWon.length / (closedWon.length + closedLost.length)
    : 0

  // Calculate stage breakdown
  const stageBreakdown = DEAL_STAGES.filter(s => !["closed_won", "closed_lost"].includes(s)).map(stage => {
    const stageDeals = openDeals.filter(d => d.stage === stage)
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
    }
  })

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground">{openDeals.length} open deals</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(weightedValue)}</div>
          <p className="text-xs text-muted-foreground">Based on probability</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(winRate * 100).toFixed(0)}%</div>
          <p className="text-xs text-muted-foreground">
            {closedWon.length} won / {closedLost.length} lost
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">By Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {stageBreakdown.slice(0, 3).map(({ stage, count, value }) => (
              <div key={stage} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {DEAL_STAGE_LABELS[stage as keyof typeof DEAL_STAGE_LABELS]}
                </span>
                <span>{count} ({formatCurrency(value)})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function PipelineList({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  let query = supabase
    .from("deals")
    .select(`
      id,
      title,
      stage,
      value,
      probability,
      close_date,
      ai_next_action,
      ai_risk_score,
      company:companies (id, name),
      contact:contacts (id, first_name, last_name)
    `, { count: "exact" })
    .eq("workspace_id", membership.workspace_id)

  // Apply filters
  if (searchParams.search) {
    query = query.ilike("title", `%${searchParams.search}%`)
  }
  if (searchParams.stage && searchParams.stage !== "all") {
    query = query.eq("stage", searchParams.stage)
  }

  // Pagination
  const page = parseInt(searchParams.page || "1")
  const pageSize = 20
  query = query.order("value", { ascending: false, nullsFirst: false })
  query = query.range((page - 1) * pageSize, page * pageSize - 1)

  const { data: deals, count } = await query

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead>Deal</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-center">Probability</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead>AI Insight</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals?.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No deals found</p>
                    <Button asChild size="sm">
                      <Link href="/pipeline/new">Create Deal</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {deals?.map((deal) => {
              const company = deal.company as { id: string; name: string } | null
              const contact = deal.contact as { id: string; first_name: string; last_name: string } | null
              const isAtRisk = deal.ai_risk_score && deal.ai_risk_score > 60

              return (
                <TableRow key={deal.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/pipeline/${deal.id}`}
                      className="font-medium hover:underline flex items-center gap-2"
                    >
                      {deal.title}
                      {isAtRisk && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {company ? (
                      <Link
                        href={`/accounts/${company.id}`}
                        className="hover:underline"
                      >
                        {company.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {contact ? (
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="hover:underline"
                      >
                        {contact.first_name} {contact.last_name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={DEAL_STAGE_COLORS[deal.stage as keyof typeof DEAL_STAGE_COLORS]}>
                      {DEAL_STAGE_LABELS[deal.stage as keyof typeof DEAL_STAGE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(deal.value || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {deal.probability
                      ? `${(deal.probability * 100).toFixed(0)}%`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {deal.close_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(deal.close_date)}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {deal.ai_next_action && (
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                        {deal.ai_next_action}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/pipeline/${deal.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, count || 0)} of {count || 0} deals
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/pipeline?page=${page - 1}`}>Previous</Link>
            </Button>
          )}
          {(count || 0) > page * pageSize && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/pipeline?page=${page + 1}`}>Next</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

async function KanbanView() {
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
      stage,
      value,
      probability,
      ai_risk_score,
      company:companies (name)
    `)
    .eq("workspace_id", membership.workspace_id)
    .not("stage", "in", "(closed_won,closed_lost)")
    .order("value", { ascending: false })

  const stages = DEAL_STAGES.filter(s => !["closed_won", "closed_lost"].includes(s))

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageDeals = deals?.filter(d => d.stage === stage) || []
        const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)

        return (
          <div key={stage} className="flex-shrink-0 w-72">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">
                  {DEAL_STAGE_LABELS[stage as keyof typeof DEAL_STAGE_LABELS]}
                </h3>
                <Badge variant="secondary">
                  {stageDeals.length} • {formatCurrency(stageValue)}
                </Badge>
              </div>
              <div className="space-y-2">
                {stageDeals.map((deal) => {
                  const company = deal.company as { name: string } | null
                  const isAtRisk = deal.ai_risk_score && deal.ai_risk_score > 60

                  return (
                    <Link
                      key={deal.id}
                      href={`/pipeline/${deal.id}`}
                      className="block p-3 bg-card rounded-md shadow-sm hover:shadow transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm">{deal.title}</p>
                        {isAtRisk && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      {company && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {company.name}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(deal.value || 0)}
                        </span>
                        {deal.probability && (
                          <span className="text-xs text-muted-foreground">
                            {(deal.probability * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
                {stageDeals.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No deals
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const view = params.view || "list"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">
            Track and manage your deals
          </p>
        </div>
        <Button asChild>
          <Link href="/pipeline/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Deal
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <PipelineStats />
      </Suspense>

      <Tabs defaultValue={view}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" asChild>
              <Link href="/pipeline?view=list">List</Link>
            </TabsTrigger>
            <TabsTrigger value="kanban" asChild>
              <Link href="/pipeline?view=kanban">Kanban</Link>
            </TabsTrigger>
          </TabsList>

          {view === "list" && (
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search deals..."
                  className="pl-10"
                  defaultValue={params.search}
                />
              </div>
              <Select defaultValue={params.stage || "all"}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {DEAL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {DEAL_STAGE_LABELS[stage as keyof typeof DEAL_STAGE_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="list" className="mt-4 space-y-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <PipelineList searchParams={params} />
          </Suspense>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <KanbanView />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
