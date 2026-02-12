import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { formatNumber, formatCurrency } from "@/lib/utils"
import {
  Search,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Mail,
  Trash2,
  ArrowUpDown,
  Building2,
  TrendingUp,
  Target,
} from "lucide-react"

interface SearchParams {
  search?: string
  industry?: string
  funding?: string
  sort?: string
  page?: string
}

async function AccountsTable({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single()

  if (!membership) return null

  let query = supabase
    .from("companies")
    .select(`
      id,
      name,
      domain,
      industry,
      employee_count,
      funding_stage,
      funding_total,
      tech_stack,
      location,
      fit_score,
      intent_score,
      combined_score,
      contacts (count),
      deals (count)
    `, { count: "exact" })
    .eq("workspace_id", membership.workspace_id)

  // Apply filters
  if (searchParams.search) {
    query = query.or(`name.ilike.%${searchParams.search}%,domain.ilike.%${searchParams.search}%`)
  }
  if (searchParams.industry) {
    query = query.eq("industry", searchParams.industry)
  }
  if (searchParams.funding) {
    query = query.eq("funding_stage", searchParams.funding)
  }

  // Apply sorting
  const sortField = searchParams.sort || "combined_score"
  query = query.order(sortField, { ascending: false, nullsFirst: false })

  // Pagination
  const page = parseInt(searchParams.page || "1")
  const pageSize = 20
  query = query.range((page - 1) * pageSize, page * pageSize - 1)

  const { data: companies, count } = await query

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground"
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Funding</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Target className="h-4 w-4" />
                  Fit
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Intent
                </div>
              </TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Deals</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies?.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No companies found</p>
                    <Button asChild size="sm">
                      <Link href="/prospects/discover">Discover Prospects</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {companies?.map((company) => {
              const contactCount = (company.contacts as { count: number }[])?.[0]?.count || 0
              const dealCount = (company.deals as { count: number }[])?.[0]?.count || 0
              return (
                <TableRow key={company.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/accounts/${company.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-medium">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        {company.domain && (
                          <p className="text-xs text-muted-foreground">{company.domain}</p>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {company.industry && (
                      <Badge variant="secondary">{company.industry}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.employee_count && formatNumber(company.employee_count)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {company.funding_stage && (
                        <Badge variant="outline">{company.funding_stage}</Badge>
                      )}
                      {company.funding_total && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(company.funding_total)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${getScoreColor(company.fit_score)}`}>
                      {company.fit_score?.toFixed(0) || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${getScoreColor(company.intent_score)}`}>
                      {company.intent_score?.toFixed(0) || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${getScoreColor(company.combined_score)}`}>
                      {company.combined_score?.toFixed(0) || "-"}
                    </span>
                  </TableCell>
                  <TableCell>{contactCount}</TableCell>
                  <TableCell>{dealCount}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/accounts/${company.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
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
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, count || 0)} of {count || 0} companies
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/accounts?page=${page - 1}`}>Previous</Link>
            </Button>
          )}
          {(count || 0) > page * pageSize && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/accounts?page=${page + 1}`}>Next</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your target companies and track engagement
          </p>
        </div>
        <Button asChild>
          <Link href="/prospects/discover">
            <Plus className="mr-2 h-4 w-4" />
            Add Companies
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search companies..."
            className="pl-10"
            defaultValue={params.search}
          />
        </div>

        <Select defaultValue={params.industry}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="saas">SaaS</SelectItem>
            <SelectItem value="fintech">Fintech</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="ecommerce">E-commerce</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue={params.funding}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Funding Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="seed">Seed</SelectItem>
            <SelectItem value="series_a">Series A</SelectItem>
            <SelectItem value="series_b">Series B</SelectItem>
            <SelectItem value="series_c">Series C+</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue={params.sort || "combined_score"}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="combined_score">Combined Score</SelectItem>
            <SelectItem value="fit_score">Fit Score</SelectItem>
            <SelectItem value="intent_score">Intent Score</SelectItem>
            <SelectItem value="employee_count">Company Size</SelectItem>
            <SelectItem value="created_at">Recently Added</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <AccountsTable searchParams={params} />
      </Suspense>
    </div>
  )
}
