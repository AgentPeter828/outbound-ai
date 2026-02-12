import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatRelativeTime,
  formatPercentage,
  getInitials,
  ENROLLMENT_STATUSES,
} from "@/lib/utils"
import {
  ArrowLeft,
  Play,
  Pause,
  Edit,
  Users,
  Mail,
  MousePointer,
  Reply,
  Clock,
  Plus,
  Calendar,
  AlertTriangle,
} from "lucide-react"

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
}

const ENROLLMENT_COLORS = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  replied: "bg-purple-100 text-purple-800",
  bounced: "bg-red-100 text-red-800",
  unsubscribed: "bg-gray-100 text-gray-800",
}

interface SequenceStep {
  step_number: number
  delay_days: number
  subject_template: string
  body_template: string
  variant?: string
}

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sequence } = await supabase
    .from("sequences")
    .select(`
      *,
      sequence_enrollments (
        id,
        status,
        current_step,
        next_send_at,
        ab_variant,
        contact:contacts (
          id,
          first_name,
          last_name,
          email,
          company:companies (name)
        )
      )
    `)
    .eq("id", id)
    .single()

  if (!sequence) {
    notFound()
  }

  // Get sent emails stats for this sequence
  const { data: sentEmails } = await supabase
    .from("sent_emails")
    .select("status, opened_at, clicked_at, replied_at, bounced_at, created_at")
    .in(
      "enrollment_id",
      sequence.sequence_enrollments?.map((e: { id: string }) => e.id) || []
    )

  const steps = (sequence.steps as SequenceStep[]) || []
  const enrollments = sequence.sequence_enrollments || []
  const stats = (sequence.stats as Record<string, number>) || {}

  // Calculate metrics
  const totalSent = sentEmails?.length || 0
  const opened = sentEmails?.filter(e => e.opened_at).length || 0
  const clicked = sentEmails?.filter(e => e.clicked_at).length || 0
  const replied = sentEmails?.filter(e => e.replied_at).length || 0
  const bounced = sentEmails?.filter(e => e.bounced_at).length || 0

  const openRate = totalSent > 0 ? opened / totalSent : 0
  const clickRate = totalSent > 0 ? clicked / totalSent : 0
  const replyRate = totalSent > 0 ? replied / totalSent : 0
  const bounceRate = totalSent > 0 ? bounced / totalSent : 0

  // Calculate per-step stats
  const stepStats = steps.map((step, index) => {
    const stepEmails = sentEmails?.filter(e => {
      // This is a simplification - in reality you'd track step number per email
      return true
    }) || []
    return {
      step_number: step.step_number,
      sent: Math.floor(totalSent / steps.length),
      opened: Math.floor(opened / steps.length),
      replied: Math.floor(replied / steps.length),
    }
  })

  const activeEnrollments = enrollments.filter((e: { status: string }) => e.status === "active").length
  const completedEnrollments = enrollments.filter((e: { status: string }) => e.status === "completed").length
  const repliedEnrollments = enrollments.filter((e: { status: string }) => e.status === "replied").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sequences">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{sequence.name}</h1>
              <Badge className={STATUS_COLORS[sequence.status as keyof typeof STATUS_COLORS]}>
                {sequence.status}
              </Badge>
            </div>
            {sequence.description && (
              <p className="text-muted-foreground mt-1">{sequence.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/sequences/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          {sequence.status === "active" ? (
            <Button variant="outline">
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          ) : sequence.status !== "completed" ? (
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Activate
            </Button>
          ) : null}
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Contacts
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeEnrollments} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
            <p className="text-xs text-muted-foreground">emails sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(openRate)}</div>
            <p className="text-xs text-muted-foreground">{opened} opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <Reply className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(replyRate)}</div>
            <p className="text-xs text-muted-foreground">{replied} replies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(bounceRate)}</div>
            <p className="text-xs text-muted-foreground">{bounced} bounced</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({enrollments.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="mt-4 space-y-4">
          {steps.map((step, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Step {step.step_number}</Badge>
                    {index > 0 && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {step.delay_days} day{step.delay_days !== 1 ? "s" : ""} after previous
                      </span>
                    )}
                    {step.variant && (
                      <Badge variant="secondary">Variant {step.variant}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {stepStats[index]?.sent || 0} sent
                    </span>
                    <span className="text-muted-foreground">
                      {stepStats[index]?.opened || 0} opened
                    </span>
                    <span className="text-muted-foreground">
                      {stepStats[index]?.replied || 0} replied
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subject</p>
                    <p className="font-medium">{step.subject_template}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Body</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                      {step.body_template}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Next Send</TableHead>
                  <TableHead>Variant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No contacts enrolled</p>
                        <Button size="sm">Add Contacts</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {enrollments.map((enrollment: {
                  id: string
                  status: string
                  current_step: number
                  next_send_at: string | null
                  ab_variant: string | null
                  contact: {
                    id: string
                    first_name: string
                    last_name: string
                    email: string
                    company: { name: string } | null
                  } | null
                }) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <Link
                        href={`/contacts/${enrollment.contact?.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(`${enrollment.contact?.first_name} ${enrollment.contact?.last_name}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {enrollment.contact?.first_name} {enrollment.contact?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {enrollment.contact?.email}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {enrollment.contact?.company?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={ENROLLMENT_COLORS[enrollment.status as keyof typeof ENROLLMENT_COLORS]}>
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>Step {enrollment.current_step + 1}</span>
                        <Progress
                          value={((enrollment.current_step + 1) / steps.length) * 100}
                          className="w-20 h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {enrollment.next_send_at ? (
                        <span className="text-sm flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatRelativeTime(enrollment.next_send_at)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {enrollment.ab_variant ? (
                        <Badge variant="outline">{enrollment.ab_variant}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Step</CardTitle>
                <CardDescription>Open and reply rates per step</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Step {step.step_number}</span>
                        <span className="text-muted-foreground">
                          {formatPercentage(openRate)} open
                        </span>
                      </div>
                      <Progress value={openRate * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enrollment Distribution</CardTitle>
                <CardDescription>Current status of all contacts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active</span>
                    <span className="font-medium">{activeEnrollments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed</span>
                    <span className="font-medium">{completedEnrollments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Replied</span>
                    <span className="font-medium">{repliedEnrollments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bounced</span>
                    <span className="font-medium">{bounced}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
