import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  formatCurrency,
  formatNumber,
  formatRelativeTime,
  getInitials,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  ROLE_TYPE_LABELS,
} from "@/lib/utils"
import {
  Building2,
  Globe,
  Users,
  MapPin,
  Linkedin,
  Mail,
  Phone,
  TrendingUp,
  Target,
  ExternalLink,
  Plus,
  ArrowLeft,
  Sparkles,
  Calendar,
  DollarSign,
} from "lucide-react"

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from("companies")
    .select(`
      *,
      contacts (*),
      deals (
        id,
        title,
        stage,
        value,
        probability,
        close_date,
        ai_next_action
      )
    `)
    .eq("id", id)
    .single()

  if (!company) {
    notFound()
  }

  // Get recent interactions for this company's contacts
  const contactIds = company.contacts?.map((c: { id: string }) => c.id) || []
  const { data: interactions } = contactIds.length > 0
    ? await supabase
        .from("interactions")
        .select("*")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] }

  // Get similar companies
  const { data: similarCompanies } = company.embedding
    ? await supabase.rpc("match_companies", {
        query_embedding: company.embedding,
        match_threshold: 0.7,
        match_count: 5,
        p_workspace_id: company.workspace_id,
      })
    : { data: [] }

  const techStack = company.tech_stack || []
  const contacts = company.contacts || []
  const deals = company.deals || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-2xl font-semibold">
            {company.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-muted-foreground">
              {company.domain && (
                <a
                  href={`https://${company.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Globe className="h-4 w-4" />
                  {company.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {company.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {company.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/sequences/new?company=${company.id}`}>
              <Mail className="mr-2 h-4 w-4" />
              Create Sequence
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/pipeline/new?company=${company.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Deal
            </Link>
          </Button>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Combined Score</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {company.combined_score?.toFixed(0) || "-"}
            </div>
            <p className="text-xs text-muted-foreground">AI-calculated fit + intent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fit Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {company.fit_score?.toFixed(0) || "-"}
            </div>
            <p className="text-xs text-muted-foreground">ICP match</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intent Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {company.intent_score?.toFixed(0) || "-"}
            </div>
            <p className="text-xs text-muted-foreground">Buying signals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deal Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(deals.reduce((sum: number, d: { value: number | null }) => sum + (d.value || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">{deals.length} active deals</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="space-y-4 mt-4">
              {contacts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No contacts yet</p>
                    <Button size="sm" className="mt-2" asChild>
                      <Link href={`/prospects/discover?company=${company.id}`}>
                        Find Contacts
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                contacts.map((contact: {
                  id: string
                  first_name: string
                  last_name: string
                  email: string
                  title: string
                  role_type: string
                  phone: string
                  linkedin_url: string
                }) => (
                  <Card key={contact.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(`${contact.first_name} ${contact.last_name}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{contact.title}</p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        {contact.role_type && (
                          <Badge variant="outline">
                            {ROLE_TYPE_LABELS[contact.role_type as keyof typeof ROLE_TYPE_LABELS]}
                          </Badge>
                        )}
                        {contact.email && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`mailto:${contact.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {contact.phone && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`tel:${contact.phone}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {contact.linkedin_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                              <Linkedin className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="deals" className="space-y-4 mt-4">
              {deals.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No deals yet</p>
                    <Button size="sm" className="mt-2" asChild>
                      <Link href={`/pipeline/new?company=${company.id}`}>
                        Create Deal
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                deals.map((deal: {
                  id: string
                  title: string
                  stage: string
                  value: number | null
                  probability: number | null
                  close_date: string | null
                  ai_next_action: string | null
                }) => (
                  <Card key={deal.id}>
                    <CardContent className="p-4">
                      <Link
                        href={`/pipeline/${deal.id}`}
                        className="flex items-center justify-between hover:underline"
                      >
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={DEAL_STAGE_COLORS[deal.stage as keyof typeof DEAL_STAGE_COLORS]}>
                              {DEAL_STAGE_LABELS[deal.stage as keyof typeof DEAL_STAGE_LABELS]}
                            </Badge>
                            {deal.close_date && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Close: {new Date(deal.close_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(deal.value || 0)}</p>
                          {deal.probability && (
                            <p className="text-sm text-muted-foreground">
                              {(deal.probability * 100).toFixed(0)}% probability
                            </p>
                          )}
                        </div>
                      </Link>
                      {deal.ai_next_action && (
                        <div className="mt-3 p-2 bg-muted/50 rounded-md flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                          <p className="text-sm">{deal.ai_next_action}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {interactions?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
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
                            <p className="text-sm">
                              <span className="font-medium">
                                {interaction.type.replace(/_/g, " ")}
                              </span>
                              {interaction.subject && `: ${interaction.subject}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(interaction.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.industry && (
                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="font-medium">{company.industry}</p>
                </div>
              )}
              {company.employee_count && (
                <div>
                  <p className="text-sm text-muted-foreground">Employees</p>
                  <p className="font-medium">{formatNumber(company.employee_count)}</p>
                </div>
              )}
              {company.funding_stage && (
                <div>
                  <p className="text-sm text-muted-foreground">Funding Stage</p>
                  <p className="font-medium">{company.funding_stage}</p>
                </div>
              )}
              {company.funding_total && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Funding</p>
                  <p className="font-medium">{formatCurrency(company.funding_total)}</p>
                </div>
              )}
              {company.linkedin_url && (
                <div>
                  <a
                    href={company.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Linkedin className="h-4 w-4" />
                    View on LinkedIn
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tech Stack */}
          {techStack.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tech Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech: string) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {company.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{company.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Similar Companies */}
          {similarCompanies && similarCompanies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Similar Companies</CardTitle>
                <CardDescription>Based on AI similarity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {similarCompanies
                    .filter((c: { id: string }) => c.id !== company.id)
                    .slice(0, 5)
                    .map((similar: { id: string; name: string; domain: string; similarity: number }) => (
                      <Link
                        key={similar.id}
                        href={`/accounts/${similar.id}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-medium">
                            {similar.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{similar.name}</p>
                            <p className="text-xs text-muted-foreground">{similar.domain}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(similar.similarity * 100).toFixed(0)}%
                        </span>
                      </Link>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
