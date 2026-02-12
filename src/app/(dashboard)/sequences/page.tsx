import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatRelativeTime, formatPercentage } from "@/lib/utils"
import {
  Plus,
  Mail,
  MoreHorizontal,
  Play,
  Pause,
  ExternalLink,
  Copy,
  Trash2,
  Users,
  MousePointer,
  Reply,
  Calendar,
} from "lucide-react"

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
}

async function SequenceStats() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const [
    { count: totalSequences },
    { count: activeSequences },
    { data: enrollments },
    { data: sentEmails },
  ] = await Promise.all([
    supabase.from("sequences").select("*", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
    supabase.from("sequences").select("*", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).eq("status", "active"),
    supabase
      .from("sequence_enrollments")
      .select("status, sequence:sequences!inner(workspace_id)")
      .eq("sequences.workspace_id", membership.workspace_id),
    supabase
      .from("sent_emails")
      .select("status, opened_at, replied_at")
      .eq("workspace_id", membership.workspace_id),
  ])

  const activeEnrollments = enrollments?.filter(e => e.status === "active").length || 0
  const openedEmails = sentEmails?.filter(e => e.opened_at).length || 0
  const repliedEmails = sentEmails?.filter(e => e.replied_at).length || 0
  const totalSent = sentEmails?.length || 0
  const openRate = totalSent > 0 ? openedEmails / totalSent : 0
  const replyRate = totalSent > 0 ? repliedEmails / totalSent : 0

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
          <Play className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeSequences || 0}</div>
          <p className="text-xs text-muted-foreground">of {totalSequences || 0} total</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Enrolled Contacts</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeEnrollments}</div>
          <p className="text-xs text-muted-foreground">currently in sequences</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
          <MousePointer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(openRate)}</div>
          <p className="text-xs text-muted-foreground">{openedEmails} of {totalSent} opened</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
          <Reply className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(replyRate)}</div>
          <p className="text-xs text-muted-foreground">{repliedEmails} replies received</p>
        </CardContent>
      </Card>
    </div>
  )
}

async function SequencesList() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  const { data: sequences } = await supabase
    .from("sequences")
    .select(`
      id,
      name,
      description,
      status,
      steps,
      stats,
      created_at,
      updated_at,
      sequence_enrollments (count)
    `)
    .eq("workspace_id", membership.workspace_id)
    .order("updated_at", { ascending: false })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sequence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Steps</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead className="text-center">Open Rate</TableHead>
            <TableHead className="text-center">Reply Rate</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sequences?.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No sequences yet</p>
                  <Button asChild size="sm">
                    <Link href="/sequences/new">Create Sequence</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {sequences?.map((sequence) => {
            const steps = (sequence.steps as unknown[]) || []
            const stats = (sequence.stats as { open_rate?: number; reply_rate?: number; meeting_rate?: number }) || {}
            const enrollments = (sequence.sequence_enrollments as { count: number }[])?.[0]?.count || 0

            return (
              <TableRow key={sequence.id}>
                <TableCell>
                  <Link
                    href={`/sequences/${sequence.id}`}
                    className="hover:underline"
                  >
                    <p className="font-medium">{sequence.name}</p>
                    {sequence.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {sequence.description}
                      </p>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[sequence.status as keyof typeof STATUS_COLORS]}>
                    {sequence.status}
                  </Badge>
                </TableCell>
                <TableCell>{steps.length} steps</TableCell>
                <TableCell>{enrollments}</TableCell>
                <TableCell className="text-center">
                  {stats.open_rate ? formatPercentage(stats.open_rate) : "-"}
                </TableCell>
                <TableCell className="text-center">
                  {stats.reply_rate ? formatPercentage(stats.reply_rate) : "-"}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(sequence.updated_at)}
                  </span>
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
                        <Link href={`/sequences/${sequence.id}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {sequence.status === "active" ? (
                        <DropdownMenuItem>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause Sequence
                        </DropdownMenuItem>
                      ) : sequence.status !== "completed" ? (
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Activate Sequence
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
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
  )
}

export default function SequencesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sequences</h1>
          <p className="text-muted-foreground">
            Automated email campaigns to engage your prospects
          </p>
        </div>
        <Button asChild>
          <Link href="/sequences/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Sequence
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <SequenceStats />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <SequencesList />
      </Suspense>
    </div>
  )
}
