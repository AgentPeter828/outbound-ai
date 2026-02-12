import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  formatRelativeTime,
  getInitials,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  ROLE_TYPE_LABELS,
} from "@/lib/utils"
import {
  Mail,
  Phone,
  Linkedin,
  Building2,
  ArrowLeft,
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ExternalLink,
} from "lucide-react"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contact } = await supabase
    .from("contacts")
    .select(`
      *,
      company:companies (*),
      deals (*),
      sequence_enrollments (
        id,
        status,
        current_step,
        next_send_at,
        ab_variant,
        sequence:sequences (id, name, steps)
      )
    `)
    .eq("id", id)
    .single()

  if (!contact) {
    notFound()
  }

  // Get interactions for this contact
  const { data: interactions } = await supabase
    .from("interactions")
    .select("*")
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Get sent emails
  const { data: sentEmails } = await supabase
    .from("sent_emails")
    .select("*")
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(10)

  const company = contact.company as {
    id: string
    name: string
    domain: string
    industry: string
  } | null
  const deals = contact.deals || []
  const enrollments = contact.sequence_enrollments || []
  const activeEnrollment = enrollments.find((e: { status: string }) => e.status === "active")

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "email_sent":
      case "email_received":
        return Mail
      case "email_opened":
        return ExternalLink
      case "meeting":
        return Calendar
      case "call":
        return Phone
      default:
        return MessageSquare
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">
              {getInitials(`${contact.first_name} ${contact.last_name}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {contact.first_name} {contact.last_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {contact.title && (
                <span className="text-muted-foreground">{contact.title}</span>
              )}
              {contact.role_type && (
                <Badge variant="outline">
                  {ROLE_TYPE_LABELS[contact.role_type as keyof typeof ROLE_TYPE_LABELS]}
                </Badge>
              )}
            </div>
            {company && (
              <Link
                href={`/accounts/${company.id}`}
                className="flex items-center gap-1 mt-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                {company.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {contact.email && (
            <Button variant="outline" asChild>
              <a href={`mailto:${contact.email}`}>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </a>
            </Button>
          )}
          <Button asChild>
            <Link href={`/sequences/new?contact=${contact.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add to Sequence
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="emails">Emails ({sentEmails?.length || 0})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {interactions?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No activity yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {interactions?.map((interaction) => {
                        const Icon = getInteractionIcon(interaction.type)
                        return (
                          <div key={interaction.id} className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                              <Icon className="h-4 w-4" />
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
                              {interaction.sentiment && (
                                <Badge
                                  variant={
                                    interaction.sentiment === "positive"
                                      ? "success"
                                      : interaction.sentiment === "negative"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="mt-1"
                                >
                                  {interaction.sentiment}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails" className="mt-4 space-y-4">
              {sentEmails?.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Mail className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No emails sent yet</p>
                  </CardContent>
                </Card>
              ) : (
                sentEmails?.map((email) => (
                  <Card key={email.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{email.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatRelativeTime(email.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={email.status === "replied" ? "success" : "secondary"}>
                            {email.status}
                          </Badge>
                          {email.opened_at && (
                            <Badge variant="outline">Opened</Badge>
                          )}
                        </div>
                      </div>
                      {email.body_text && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                          {email.body_text}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="deals" className="mt-4 space-y-4">
              {deals.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No deals yet</p>
                    <Button size="sm" className="mt-2" asChild>
                      <Link href={`/pipeline/new?contact=${contact.id}`}>
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
                  value: number
                }) => (
                  <Card key={deal.id}>
                    <CardContent className="p-4">
                      <Link
                        href={`/pipeline/${deal.id}`}
                        className="flex items-center justify-between hover:underline"
                      >
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <Badge className={DEAL_STAGE_COLORS[deal.stage as keyof typeof DEAL_STAGE_COLORS]}>
                            {DEAL_STAGE_LABELS[deal.stage as keyof typeof DEAL_STAGE_LABELS]}
                          </Badge>
                        </div>
                        <p className="font-semibold">${(deal.value || 0).toLocaleString()}</p>
                      </Link>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-sm hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                  {contact.email_verified ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-sm hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.linkedin_url && (
                <div className="flex items-center gap-3">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sequence Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sequence Status</CardTitle>
            </CardHeader>
            <CardContent>
              {activeEnrollment ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Sequence</p>
                    <p className="font-medium">
                      {(activeEnrollment.sequence as { name: string } | null)?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Step</p>
                    <p className="font-medium">
                      Step {activeEnrollment.current_step + 1}
                    </p>
                  </div>
                  {activeEnrollment.next_send_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Next Email</p>
                      <p className="font-medium">
                        {formatRelativeTime(activeEnrollment.next_send_at)}
                      </p>
                    </div>
                  )}
                  <Badge>{activeEnrollment.status}</Badge>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Not enrolled in any sequence
                  </p>
                  <Button size="sm" asChild>
                    <Link href={`/sequences/new?contact=${contact.id}`}>
                      Add to Sequence
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signals */}
          {contact.signals && Object.keys(contact.signals).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Intent Signals</CardTitle>
                <CardDescription>Recent buying indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(contact.signals as Record<string, string>).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span>{value}</span>
                    </div>
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
