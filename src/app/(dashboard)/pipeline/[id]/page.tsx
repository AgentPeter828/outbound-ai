import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
} from "@/lib/utils"
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Mail,
  Phone,
  Clock,
  ChevronRight,
  Edit,
} from "lucide-react"

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: deal } = await supabase
    .from("deals")
    .select(`
      *,
      company:companies (*),
      contact:contacts (*)
    `)
    .eq("id", id)
    .single()

  if (!deal) {
    notFound()
  }

  // Get interactions for this deal
  const { data: interactions } = await supabase
    .from("interactions")
    .select("*")
    .eq("deal_id", id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Get meetings for this deal
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*")
    .eq("deal_id", id)
    .order("start_time", { ascending: false })
    .limit(5)

  const company = deal.company as {
    id: string
    name: string
    domain: string
    industry: string
    employee_count: number
    fit_score: number
  } | null

  const contact = deal.contact as {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    title: string
  } | null

  const currentStageIndex = DEAL_STAGES.indexOf(deal.stage)
  const isAtRisk = deal.ai_risk_score && deal.ai_risk_score > 60

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pipeline">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{deal.title}</h1>
              {isAtRisk && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  At Risk
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Badge className={DEAL_STAGE_COLORS[deal.stage as keyof typeof DEAL_STAGE_COLORS]}>
                {DEAL_STAGE_LABELS[deal.stage as keyof typeof DEAL_STAGE_LABELS]}
              </Badge>
              {company && (
                <Link
                  href={`/accounts/${company.id}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  {company.name}
                </Link>
              )}
              {contact && (
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                  {contact.first_name} {contact.last_name}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Deal
          </Button>
          <Button>Move Stage</Button>
        </div>
      </div>

      {/* Stage Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {DEAL_STAGES.filter(s => !["closed_won", "closed_lost"].includes(s)).map((stage, index) => {
              const isPast = index < currentStageIndex
              const isCurrent = stage === deal.stage
              const isFuture = index > currentStageIndex

              return (
                <div key={stage} className="flex items-center flex-1">
                  <div
                    className={`flex-1 h-2 rounded-full ${
                      isPast || isCurrent ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  {index < DEAL_STAGES.filter(s => !["closed_won", "closed_lost"].includes(s)).length - 1 && (
                    <ChevronRight className={`h-4 w-4 mx-1 ${isFuture ? "text-muted" : "text-primary"}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {DEAL_STAGES.filter(s => !["closed_won", "closed_lost"].includes(s)).map((stage) => (
              <span
                key={stage}
                className={stage === deal.stage ? "text-foreground font-medium" : ""}
              >
                {DEAL_STAGE_LABELS[stage as keyof typeof DEAL_STAGE_LABELS]}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* AI Recommendations */}
          {(deal.ai_next_action || isAtRisk) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deal.ai_next_action && (
                  <div>
                    <p className="text-sm font-medium">Suggested Next Action</p>
                    <p className="text-sm text-muted-foreground">{deal.ai_next_action}</p>
                  </div>
                )}
                {isAtRisk && (
                  <div>
                    <p className="text-sm font-medium text-orange-600">Risk Alert</p>
                    <p className="text-sm text-muted-foreground">
                      This deal has a risk score of {deal.ai_risk_score?.toFixed(0)}%.
                      Consider reaching out soon to keep momentum.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="meetings">Meetings ({meetings?.length || 0})</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {interactions?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No activity yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {interactions?.map((interaction) => (
                        <div key={interaction.id} className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Mail className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {interaction.type.replace(/_/g, " ")}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(interaction.created_at)}
                              </span>
                            </div>
                            {interaction.subject && (
                              <p className="text-sm">{interaction.subject}</p>
                            )}
                            {interaction.content && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {interaction.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meetings" className="mt-4 space-y-4">
              {meetings?.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No meetings scheduled</p>
                    <Button size="sm" className="mt-2">
                      Schedule Meeting
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                meetings?.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardContent className="p-4">
                      <Link
                        href={`/meetings/${meeting.id}`}
                        className="flex items-start justify-between hover:underline"
                      >
                        <div>
                          <p className="font-medium">{meeting.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {meeting.start_time && formatDate(meeting.start_time)}
                          </p>
                        </div>
                        {meeting.ai_summary && (
                          <Badge variant="outline">Has Summary</Badge>
                        )}
                      </Link>
                      {meeting.ai_summary && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {meeting.ai_summary}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Deal Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {deal.notes || "No notes yet"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Add Note</p>
                    <Textarea placeholder="Type your note..." rows={3} />
                    <Button size="sm" className="mt-2">Save Note</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Deal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="text-xl font-bold">{formatCurrency(deal.value || 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Probability</p>
                  <p className="font-medium">
                    {deal.probability ? `${(deal.probability * 100).toFixed(0)}%` : "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Expected Close</p>
                  <p className="font-medium">
                    {deal.close_date ? formatDate(deal.close_date) : "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatRelativeTime(deal.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          {contact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Primary Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{contact.title}</p>
                </Link>
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-sm hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-sm hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Company Info */}
          {company && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/accounts/${company.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-muted-foreground">{company.domain}</p>
                </Link>
                {company.industry && (
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <Badge variant="secondary">{company.industry}</Badge>
                  </div>
                )}
                {company.employee_count && (
                  <div>
                    <p className="text-sm text-muted-foreground">Employees</p>
                    <p className="font-medium">{company.employee_count.toLocaleString()}</p>
                  </div>
                )}
                {company.fit_score && (
                  <div>
                    <p className="text-sm text-muted-foreground">ICP Fit Score</p>
                    <p className="font-medium">{company.fit_score.toFixed(0)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
