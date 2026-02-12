import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  formatDateTime,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
} from "@/lib/utils"
import {
  ArrowLeft,
  Video,
  Calendar,
  Clock,
  Users,
  Play,
  FileText,
  Sparkles,
  Building2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Minus,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

const SENTIMENT_ICONS = {
  positive: ThumbsUp,
  neutral: Minus,
  negative: ThumbsDown,
}

const SENTIMENT_COLORS = {
  positive: "text-green-600",
  neutral: "text-gray-600",
  negative: "text-red-600",
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: meeting } = await supabase
    .from("meetings")
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

  if (!meeting) {
    notFound()
  }

  const contact = meeting.contact as {
    id: string
    first_name: string
    last_name: string
    email: string
    title: string
    company: {
      id: string
      name: string
      domain: string
      industry: string
    } | null
  } | null

  const deal = meeting.deal as {
    id: string
    title: string
    stage: string
    value: number
  } | null

  const actionItems = meeting.action_items as Array<{
    item: string
    owner: string
    completed?: boolean
  }> | null

  const sentimentAnalysis = meeting.sentiment_analysis as {
    overall: string
    moments: Array<{
      timestamp: string
      sentiment: string
      topic: string
    }>
  } | null

  const startTime = meeting.start_time ? new Date(meeting.start_time) : null
  const endTime = meeting.end_time ? new Date(meeting.end_time) : null
  const duration = startTime && endTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    : null

  const isPast = startTime && startTime < new Date()

  const SentimentIcon = sentimentAnalysis?.overall
    ? SENTIMENT_ICONS[sentimentAnalysis.overall as keyof typeof SENTIMENT_ICONS]
    : Minus

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/meetings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {meeting.title || "Meeting"}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              {startTime && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDateTime(startTime)}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {duration} minutes
                </span>
              )}
              {contact && (
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Users className="h-4 w-4" />
                  {contact.first_name} {contact.last_name}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!isPast && (
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Join Meeting
            </Button>
          )}
          {isPast && meeting.recording_url && (
            <Button asChild>
              <a href={meeting.recording_url} target="_blank" rel="noopener noreferrer">
                <Play className="mr-2 h-4 w-4" />
                Watch Recording
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* AI Summary */}
          {meeting.ai_summary && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>AI Meeting Summary</CardTitle>
                  <CardDescription>Auto-generated from transcript</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{meeting.ai_summary}</p>

                {/* Suggested Stage Change */}
                {meeting.suggested_stage && deal && meeting.suggested_stage !== deal.stage && (
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Suggested Stage Update</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Based on this meeting, consider moving the deal from{" "}
                      <Badge variant="outline">
                        {DEAL_STAGE_LABELS[deal.stage as keyof typeof DEAL_STAGE_LABELS]}
                      </Badge>
                      {" "}to{" "}
                      <Badge className={DEAL_STAGE_COLORS[meeting.suggested_stage as keyof typeof DEAL_STAGE_COLORS]}>
                        {DEAL_STAGE_LABELS[meeting.suggested_stage as keyof typeof DEAL_STAGE_LABELS]}
                      </Badge>
                    </p>
                    <Button size="sm" className="mt-2">
                      Update Stage
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {actionItems && actionItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>
                  {actionItems.filter(a => a.completed).length} of {actionItems.length} completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actionItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Checkbox checked={item.completed} />
                      <div className="flex-1">
                        <p className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                          {item.item}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned to: {item.owner}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {meeting.transcript && (
            <Card>
              <CardHeader>
                <CardTitle>Transcript</CardTitle>
                <CardDescription>Full meeting transcript</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap font-mono">
                    {meeting.transcript}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No transcript yet */}
          {!meeting.transcript && isPast && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No transcript available</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {meeting.recording_url
                    ? "This meeting was recorded but hasn't been transcribed yet."
                    : "This meeting wasn't recorded."}
                </p>
                {meeting.recording_url && (
                  <Button className="mt-4">
                    Generate Transcript
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sentiment Analysis */}
          {sentimentAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex items-center gap-2 ${SENTIMENT_COLORS[sentimentAnalysis.overall as keyof typeof SENTIMENT_COLORS]}`}>
                    <SentimentIcon className="h-5 w-5" />
                    <span className="font-medium capitalize">{sentimentAnalysis.overall}</span>
                  </div>
                </div>
                {sentimentAnalysis.moments && sentimentAnalysis.moments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Key moments:</p>
                    {sentimentAnalysis.moments.slice(0, 3).map((moment, index) => {
                      const MomentIcon = SENTIMENT_ICONS[moment.sentiment as keyof typeof SENTIMENT_ICONS]
                      return (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <MomentIcon className={`h-4 w-4 mt-0.5 ${SENTIMENT_COLORS[moment.sentiment as keyof typeof SENTIMENT_COLORS]}`} />
                          <div>
                            <p>{moment.topic}</p>
                            <p className="text-xs text-muted-foreground">{moment.timestamp}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact */}
          {contact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attendee</CardTitle>
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
                {contact.company && (
                  <Link
                    href={`/accounts/${contact.company.id}`}
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <Building2 className="h-4 w-4" />
                    {contact.company.name}
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related Deal */}
          {deal && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Deal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/pipeline/${deal.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{deal.title}</p>
                  <Badge className={DEAL_STAGE_COLORS[deal.stage as keyof typeof DEAL_STAGE_COLORS]}>
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

          {/* Recording */}
          {meeting.recording_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recording</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <Button variant="outline" asChild>
                    <a href={meeting.recording_url} target="_blank" rel="noopener noreferrer">
                      <Play className="mr-2 h-4 w-4" />
                      Open Recording
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
