import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  formatDateTime,
  getInitials,
  DEAL_STAGE_LABELS,
} from "@/lib/utils"
import {
  ArrowLeft,
  Mail,
  Send,
  Calendar,
  Building2,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Plus,
} from "lucide-react"

const CLASSIFICATION_ICONS = {
  interested: ThumbsUp,
  not_interested: ThumbsDown,
  objection: MessageSquare,
  out_of_office: Clock,
  wrong_person: User,
  unsubscribe: AlertCircle,
}

const CLASSIFICATION_COLORS = {
  interested: "bg-green-100 text-green-800",
  not_interested: "bg-red-100 text-red-800",
  objection: "bg-yellow-100 text-yellow-800",
  out_of_office: "bg-gray-100 text-gray-800",
  wrong_person: "bg-orange-100 text-orange-800",
  unsubscribe: "bg-red-100 text-red-800",
}

const SUGGESTED_ACTIONS = {
  interested: {
    title: "Great news! This prospect is interested.",
    actions: [
      "Schedule a meeting",
      "Move to Meeting Booked stage",
      "Send calendar link",
    ],
  },
  not_interested: {
    title: "This prospect isn't interested right now.",
    actions: [
      "Mark as not interested",
      "Pause sequence",
      "Try again in 6 months",
    ],
  },
  objection: {
    title: "The prospect has raised concerns.",
    actions: [
      "Address the objection",
      "Send case study",
      "Offer a demo",
    ],
  },
  out_of_office: {
    title: "The prospect is currently away.",
    actions: [
      "Pause sequence until return date",
      "Reschedule send",
    ],
  },
  wrong_person: {
    title: "This isn't the right contact.",
    actions: [
      "Ask for referral",
      "Find the right person",
      "Remove from sequence",
    ],
  },
}

export default async function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: interaction } = await supabase
    .from("interactions")
    .select(`
      *,
      contact:contacts (
        *,
        company:companies (*)
      ),
      deal:deals (*)
    `)
    .eq("id", id)
    .single()

  if (!interaction) {
    notFound()
  }

  const contact = interaction.contact as {
    id: string
    first_name: string
    last_name: string
    email: string
    title: string
    phone: string
    company: {
      id: string
      name: string
      domain: string
      industry: string
    } | null
  } | null

  const deal = interaction.deal as {
    id: string
    title: string
    stage: string
    value: number
  } | null

  const metadata = interaction.metadata as {
    classification?: string
    ai_summary?: string
    suggested_reply?: string
    original_email_id?: string
  } | null

  const classification = metadata?.classification || "other"
  const Icon = CLASSIFICATION_ICONS[classification as keyof typeof CLASSIFICATION_ICONS] || MessageSquare
  const suggestions = SUGGESTED_ACTIONS[classification as keyof typeof SUGGESTED_ACTIONS]

  // Get thread (previous emails)
  const { data: thread } = await supabase
    .from("interactions")
    .select("*")
    .eq("contact_id", contact?.id)
    .in("type", ["email_sent", "email_received"])
    .order("created_at", { ascending: true })
    .limit(10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inbox">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {interaction.subject || "(no subject)"}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={CLASSIFICATION_COLORS[classification as keyof typeof CLASSIFICATION_COLORS]}>
                <Icon className="h-3 w-3 mr-1" />
                {classification.replace("_", " ")}
              </Badge>
              {interaction.sentiment && (
                <Badge variant="outline">
                  {interaction.sentiment} sentiment
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {formatDateTime(interaction.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!deal && contact && (
            <Button variant="outline" asChild>
              <Link href={`/pipeline/new?contact=${contact.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Deal
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/meetings/new?contact=${contact?.id}`}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* AI Summary */}
          {metadata?.ai_summary && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{metadata.ai_summary}</p>
                {suggestions && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">{suggestions.title}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {suggestions.actions.map((action) => (
                        <Button key={action} variant="outline" size="sm">
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Email Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {contact
                      ? getInitials(`${contact.first_name} ${contact.last_name}`)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {contact
                      ? `${contact.first_name} ${contact.last_name}`
                      : "Unknown Sender"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contact?.email}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{interaction.content}</p>
              </div>
            </CardContent>
          </Card>

          {/* Reply Composer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reply</CardTitle>
              <CardDescription>
                Send a response to this email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {metadata?.suggested_reply && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI-Suggested Reply</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {metadata.suggested_reply}
                  </p>
                  <Button variant="link" size="sm" className="mt-2 px-0">
                    Use this reply
                  </Button>
                </div>
              )}
              <Textarea
                placeholder="Write your reply..."
                rows={6}
                defaultValue={metadata?.suggested_reply}
              />
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Save Draft
                  </Button>
                </div>
                <Button>
                  <Send className="mr-2 h-4 w-4" />
                  Send Reply
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Thread History */}
          {thread && thread.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thread History</CardTitle>
                <CardDescription>
                  {thread.length} messages in this conversation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {thread.filter(t => t.id !== id).map((email, index) => (
                  <div key={email.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start gap-3">
                      <Mail className={`h-4 w-4 mt-1 ${
                        email.type === "email_sent"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {email.type === "email_sent" ? "You" : contact?.first_name}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(email.created_at)}
                          </span>
                        </div>
                        {email.subject && (
                          <p className="text-sm font-medium mt-1">{email.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                          {email.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          {contact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact</CardTitle>
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
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {contact.email}
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/contacts/${contact.id}`}>
                    <User className="mr-2 h-4 w-4" />
                    View Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Company Info */}
          {contact?.company && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/accounts/${contact.company.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{contact.company.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.company.domain}</p>
                </Link>
                {contact.company.industry && (
                  <Badge variant="secondary">{contact.company.industry}</Badge>
                )}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/accounts/${contact.company.id}`}>
                    <Building2 className="mr-2 h-4 w-4" />
                    View Company
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Deal Info */}
          {deal && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Deal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/pipeline/${deal.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{deal.title}</p>
                  <Badge variant="outline">
                    {DEAL_STAGE_LABELS[deal.stage as keyof typeof DEAL_STAGE_LABELS]}
                  </Badge>
                </Link>
                <p className="text-lg font-semibold">
                  ${(deal.value || 0).toLocaleString()}
                </p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/pipeline/${deal.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Deal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                Pause sequence for this contact
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Mark as replied
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-destructive">
                Add to suppression list
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
