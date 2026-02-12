import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { getInitials, ROLE_TYPE_LABELS, ENROLLMENT_STATUSES } from "@/lib/utils"
import {
  Search,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Mail,
  Trash2,
  Users,
  Building2,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface SearchParams {
  search?: string
  role?: string
  company?: string
  status?: string
  page?: string
}

async function ContactsTable({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  let query = supabase
    .from("contacts")
    .select(`
      id,
      first_name,
      last_name,
      email,
      email_verified,
      title,
      role_type,
      phone,
      linkedin_url,
      contact_priority,
      company:companies (id, name, domain),
      sequence_enrollments (id, status, sequence:sequences (name))
    `, { count: "exact" })
    .eq("workspace_id", membership.workspace_id)

  // Apply filters
  if (searchParams.search) {
    query = query.or(`first_name.ilike.%${searchParams.search}%,last_name.ilike.%${searchParams.search}%,email.ilike.%${searchParams.search}%`)
  }
  if (searchParams.role && searchParams.role !== "all") {
    query = query.eq("role_type", searchParams.role)
  }
  if (searchParams.company) {
    query = query.eq("company_id", searchParams.company)
  }

  // Pagination
  const page = parseInt(searchParams.page || "1")
  const pageSize = 20
  query = query.order("created_at", { ascending: false })
  query = query.range((page - 1) * pageSize, page * pageSize - 1)

  const { data: contacts, count } = await query

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sequence Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No contacts found</p>
                    <Button asChild size="sm">
                      <Link href="/prospects/discover">Discover Contacts</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {contacts?.map((contact) => {
              const company = contact.company as { id: string; name: string; domain: string } | null
              const enrollments = contact.sequence_enrollments as Array<{
                id: string
                status: string
                sequence: { name: string } | null
              }> || []
              const activeEnrollment = enrollments.find(e => e.status === "active")

              return (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>
                          {getInitials(`${contact.first_name} ${contact.last_name}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {company ? (
                      <Link
                        href={`/accounts/${company.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {company.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{contact.title || "-"}</TableCell>
                  <TableCell>
                    {contact.role_type ? (
                      <Badge variant="outline">
                        {ROLE_TYPE_LABELS[contact.role_type as keyof typeof ROLE_TYPE_LABELS]}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {contact.email ? (
                        <>
                          <span className="text-sm">{contact.email}</span>
                          {contact.email_verified ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {activeEnrollment ? (
                      <Badge variant="default">
                        {activeEnrollment.sequence?.name || "In Sequence"}
                      </Badge>
                    ) : enrollments.length > 0 ? (
                      <Badge variant="secondary">
                        {enrollments[0].status}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not enrolled</Badge>
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
                          <Link href={`/contacts/${contact.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {contact.email && (
                          <DropdownMenuItem asChild>
                            <a href={`mailto:${contact.email}`}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Add to Sequence
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
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, count || 0)} of {count || 0} contacts
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contacts?page=${page - 1}`}>Previous</Link>
            </Button>
          )}
          {(count || 0) > page * pageSize && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contacts?page=${page + 1}`}>Next</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts and track engagement
          </p>
        </div>
        <Button asChild>
          <Link href="/prospects/discover">
            <Plus className="mr-2 h-4 w-4" />
            Add Contacts
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-10"
            defaultValue={params.search}
          />
        </div>

        <Select defaultValue={params.role || "all"}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Role Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="decision_maker">Decision Maker</SelectItem>
            <SelectItem value="champion">Champion</SelectItem>
            <SelectItem value="influencer">Influencer</SelectItem>
            <SelectItem value="end_user">End User</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue={params.status || "all"}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sequence Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">In Active Sequence</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <ContactsTable searchParams={params} />
      </Suspense>
    </div>
  )
}
