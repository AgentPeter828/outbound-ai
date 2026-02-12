import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/utils"
import {
  Video,
  Calendar,
  Users,
  FileText,
  Clock,
  Play,
  ExternalLink,
  Sparkles,
  Building2,
} from "lucide-react"

async function MeetingStats() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const now = new Date().toISOString()

  const [
    { data: upcomingMeetings },
    { data: pastMeetings },
    { data: transcribedMeetings },
  ] = await Promise.all([
    supabase
      .from("meetings")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id)
      .gte("start_time", now),
    supabase
      .from("meetings")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id)
      .lt("start_time", now),
    supabase
      .from("meetings")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id)
      .not("transcript", "is", null),
  ])

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{upcomingMeetings || 0}</div>
          <p className="text-xs text-muted-foreground">scheduled meetings</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <Video className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pastMeetings || 0}</div>
          <p className="text-xs text-muted-foreground">past meetings</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transcribed</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{transcribedMeetings || 0}</div>
          <p className="text-xs text-muted-foreground">with AI summaries</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">4h 30m</div>
          <p className="text-xs text-muted-foreground">total meeting time</p>
        </CardContent>
      </Card>
    </div>
  )
}

async function MeetingsList({ filter }: { filter: "upcoming" | "past" }) {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const now = new Date().toISOString()

  let query = supabase
    .from("meetings")
    .select(`
      id,
      title,
      start_time,
      end_time,
      recording_url,
      ai_summary,
      action_items,
      suggested_stage,
      contact:contacts (
        id,
        first_name,
        last_name,
        company:companies (name)
      ),
      deal:deals (id, title, stage)
    `)
    .eq("workspace_id", membership.workspace_id)

  if (filter === "upcoming") {
    query = query.gte("start_time", now).order("start_time", { ascending: true })
  } else {
    query = query.lt("start_time", now).order("start_time", { ascending: false })
  }

  query = query.limit(20)

  const { data: meetings } = await query

  if (!meetings || meetings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            No {filter} meetings
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            {filter === "upcoming"
              ? "Schedule meetings with your prospects to start building relationships."
              : "Your meeting history will appear here."}
          </p>
          {filter === "upcoming" && (
            <Button className="mt-4">
              <Calendar className="mr-2 h-4 w-4" />
              Connect Calendar
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => {
        const contact = meeting.contact as {
          id: string
          first_name: string
          last_name: string
          company: { name: string } | null
        } | null
        const deal = meeting.deal as {
          id: string
          title: string
          stage: string
        } | null
        const actionItems = meeting.action_items as Array<{ item: string; owner: string }> | null

        const startTime = meeting.start_time ? new Date(meeting.start_time) : null
        const endTime = meeting.end_time ? new Date(meeting.end_time) : null
        const duration = startTime && endTime
          ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
          : null

        return (
          <Card key={meeting.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Video className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="font-medium hover:underline"
                    >
                      {meeting.title || "Meeting"}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {startTime && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(startTime)}
                        </span>
                      )}
                      {duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {duration} min
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {contact && (
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="flex items-center gap-1 text-sm hover:underline"
                        >
                          <Users className="h-3 w-3" />
                          {contact.first_name} {contact.last_name}
                          {contact.company && (
                            <span className="text-muted-foreground">
                              at {contact.company.name}
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {filter === "upcoming" ? (
                    <Button size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Join
                    </Button>
                  ) : meeting.recording_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={meeting.recording_url} target="_blank" rel="noopener noreferrer">
                        <Play className="mr-2 h-4 w-4" />
                        Watch
                      </a>
                    </Button>
                  ) : null}
                  {meeting.ai_summary && (
                    <Badge variant="secondary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Summary
                    </Badge>
                  )}
                </div>
              </div>

              {/* AI Summary preview for past meetings */}
              {filter === "past" && meeting.ai_summary && (
                <div className="mt-4 p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Summary</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {meeting.ai_summary}
                  </p>
                  {actionItems && actionItems.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">
                        {actionItems.length} action item{actionItems.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    View full summary
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Prep card for upcoming meetings */}
              {filter === "upcoming" && deal && (
                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Meeting Prep</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/pipeline/${deal.id}`}
                      className="text-sm hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <Badge variant="outline">{deal.stage}</Badge>
                  </div>
                  <Link
                    href={`/meetings/${meeting.id}/prep`}
                    className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    View prep notes
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = params.tab || "upcoming"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Track meetings and get AI-powered insights
          </p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Connect Calendar
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <MeetingStats />
      </Suspense>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="upcoming" asChild>
            <Link href="/meetings?tab=upcoming">Upcoming</Link>
          </TabsTrigger>
          <TabsTrigger value="past" asChild>
            <Link href="/meetings?tab=past">Past</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <MeetingsList filter="upcoming" />
          </Suspense>
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <MeetingsList filter="past" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
