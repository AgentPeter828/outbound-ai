import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatRelativeTime, getInitials, truncate } from "@/lib/utils"
import {
  Inbox,
  Mail,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Star,
  MailQuestion,
} from "lucide-react"

const CLASSIFICATION_ICONS = {
  interested: ThumbsUp,
  not_interested: ThumbsDown,
  objection: MessageSquare,
  out_of_office: Clock,
  wrong_person: User,
  unsubscribe: AlertCircle,
  other: MailQuestion,
}

const CLASSIFICATION_COLORS = {
  interested: "bg-green-100 text-green-800",
  not_interested: "bg-red-100 text-red-800",
  objection: "bg-yellow-100 text-yellow-800",
  out_of_office: "bg-gray-100 text-gray-800",
  wrong_person: "bg-orange-100 text-orange-800",
  unsubscribe: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-800",
}

interface Reply {
  id: string
  subject: string
  content: string
  classification: string
  sentiment: string
  created_at: string
  contact: {
    id: string
    first_name: string
    last_name: string
    email: string
    company: { name: string } | null
  } | null
  enrollment: {
    sequence: { name: string } | null
  } | null
}

async function InboxStats() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  // Get reply interactions (simulated - would come from parsed emails)
  const { data: interactions } = await supabase
    .from("interactions")
    .select("*")
    .eq("workspace_id", membership.workspace_id)
    .eq("type", "email_received")
    .order("created_at", { ascending: false })

  const total = interactions?.length || 0
  const interested = interactions?.filter(i => i.sentiment === "positive").length || 0
  const needsReview = interactions?.filter(i => !i.sentiment).length || 0

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Replies</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">all time</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Interested</CardTitle>
          <ThumbsUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{interested}</div>
          <p className="text-xs text-muted-foreground">positive replies</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
          <Star className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{needsReview}</div>
          <p className="text-xs text-muted-foreground">pending classification</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {total > 0 ? "24h" : "-"}
          </div>
          <p className="text-xs text-muted-foreground">avg response time</p>
        </CardContent>
      </Card>
    </div>
  )
}

async function InboxList({ filter }: { filter: string }) {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  let query = supabase
    .from("interactions")
    .select(`
      id,
      subject,
      content,
      sentiment,
      metadata,
      created_at,
      contact:contacts (
        id,
        first_name,
        last_name,
        email,
        company:companies (name)
      )
    `)
    .eq("workspace_id", membership.workspace_id)
    .eq("type", "email_received")
    .order("created_at", { ascending: false })
    .limit(50)

  // Apply filter
  if (filter === "interested") {
    query = query.eq("sentiment", "positive")
  } else if (filter === "objections") {
    query = query.eq("sentiment", "negative")
  } else if (filter === "unread") {
    query = query.is("sentiment", null)
  }

  const { data: replies } = await query

  if (!replies || replies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No replies yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Replies from your sequences will appear here when contacts respond.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {replies.map((reply) => {
        const contact = reply.contact as {
          id: string
          first_name: string
          last_name: string
          email: string
          company: { name: string } | null
        } | null
        const metadata = reply.metadata as { classification?: string } | null
        const classification = metadata?.classification || "other"
        const Icon = CLASSIFICATION_ICONS[classification as keyof typeof CLASSIFICATION_ICONS] || MailQuestion

        return (
          <Link
            key={reply.id}
            href={`/inbox/${reply.id}`}
            className="block"
          >
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {contact
                        ? getInitials(`${contact.first_name} ${contact.last_name}`)
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {contact
                            ? `${contact.first_name} ${contact.last_name}`
                            : "Unknown"}
                        </p>
                        {contact?.company && (
                          <span className="text-sm text-muted-foreground">
                            at {contact.company.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={CLASSIFICATION_COLORS[classification as keyof typeof CLASSIFICATION_COLORS]}>
                          <Icon className="h-3 w-3 mr-1" />
                          {classification.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(reply.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-medium mt-1">
                      {reply.subject || "(no subject)"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {truncate(reply.content || "", 200)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = params.filter || "all"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground">
            View and respond to replies from your sequences
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <InboxStats />
      </Suspense>

      <Tabs defaultValue={filter}>
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/inbox">All</Link>
          </TabsTrigger>
          <TabsTrigger value="interested" asChild>
            <Link href="/inbox?filter=interested">
              <ThumbsUp className="h-4 w-4 mr-1" />
              Interested
            </Link>
          </TabsTrigger>
          <TabsTrigger value="objections" asChild>
            <Link href="/inbox?filter=objections">
              <MessageSquare className="h-4 w-4 mr-1" />
              Objections
            </Link>
          </TabsTrigger>
          <TabsTrigger value="unread" asChild>
            <Link href="/inbox?filter=unread">
              <Mail className="h-4 w-4 mr-1" />
              Needs Review
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <InboxList filter={filter} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
