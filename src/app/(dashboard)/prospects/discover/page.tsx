"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  APOLLO_INDUSTRIES,
  APOLLO_EMPLOYEE_RANGES,
  APOLLO_FUNDING_STAGES,
  APOLLO_SENIORITIES,
} from "@/lib/apollo"
import { getInitials, formatNumber, ROLE_TYPE_LABELS } from "@/lib/utils"
import {
  Search,
  ArrowLeft,
  Filter,
  Download,
  Sparkles,
  Target,
  Building2,
  Users,
  Mail,
  Linkedin,
  CheckCircle,
  Loader2,
} from "lucide-react"

interface SearchResult {
  id: string
  first_name: string
  last_name: string
  email: string
  email_status: string
  title: string
  seniority: string
  linkedin_url: string
  organization: {
    id: string
    name: string
    domain: string
    industry: string
    estimated_num_employees: number
    funding_stage: string
  }
  fit_score?: number
  role_type?: string
}

interface SearchFilters {
  industries: string[]
  employeeRanges: string[]
  fundingStages: string[]
  seniorities: string[]
  titles: string[]
  locations: string[]
}

export default function DiscoverPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(true)
  const [page, setPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  const [filters, setFilters] = useState<SearchFilters>({
    industries: [],
    employeeRanges: [],
    fundingStages: [],
    seniorities: [],
    titles: [],
    locations: [],
  })

  const [titleInput, setTitleInput] = useState("")

  const handleSearch = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            organization_industry_tag_ids: filters.industries,
            organization_num_employees_ranges: filters.employeeRanges,
            organization_latest_funding_stage_cd: filters.fundingStages,
            person_seniorities: filters.seniorities,
            person_titles: filters.titles,
            organization_locations: filters.locations,
          },
          page,
          per_page: 25,
        }),
      })

      if (!response.ok) throw new Error("Search failed")

      const data = await response.json()
      setResults(data.contacts || [])
      setTotalResults(data.pagination?.total_entries || 0)
      setSelectedIds(new Set())
    } catch {
      toast({
        title: "Search Failed",
        description: "Unable to search prospects. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select prospects to import.",
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    try {
      const selectedContacts = results.filter(r => selectedIds.has(r.id))

      const response = await fetch("/api/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: selectedContacts }),
      })

      if (!response.ok) throw new Error("Import failed")

      const data = await response.json()

      toast({
        title: "Import Successful",
        description: `Imported ${data.imported} contacts from ${data.companies} companies.`,
        variant: "success",
      })

      // Remove imported from results
      setResults(prev => prev.filter(r => !selectedIds.has(r.id)))
      setSelectedIds(new Set())
    } catch {
      toast({
        title: "Import Failed",
        description: "Unable to import prospects. Please try again.",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(results.map(r => r.id)))
    }
  }

  const addTitle = () => {
    if (titleInput.trim() && !filters.titles.includes(titleInput.trim())) {
      setFilters(prev => ({
        ...prev,
        titles: [...prev.titles, titleInput.trim()],
      }))
      setTitleInput("")
    }
  }

  const removeTitle = (title: string) => {
    setFilters(prev => ({
      ...prev,
      titles: prev.titles.filter(t => t !== title),
    }))
  }

  const toggleFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/prospects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Discover Prospects</h1>
            <p className="text-muted-foreground">
              Search for companies and contacts matching your ICP
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? "Hide" : "Show"} Filters
          </Button>
          {selectedIds.size > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Import {selectedIds.size} Selected
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Filters Sidebar */}
        {showFilters && (
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Industry */}
              <div>
                <Label className="text-sm font-medium">Industry</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {APOLLO_INDUSTRIES.map((industry) => (
                    <div key={industry.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`industry-${industry.id}`}
                        checked={filters.industries.includes(industry.id)}
                        onCheckedChange={() => toggleFilter("industries", industry.id)}
                      />
                      <label
                        htmlFor={`industry-${industry.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {industry.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Company Size */}
              <div>
                <Label className="text-sm font-medium">Company Size</Label>
                <div className="mt-2 space-y-2">
                  {APOLLO_EMPLOYEE_RANGES.slice(0, 6).map((range) => (
                    <div key={range.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`size-${range.id}`}
                        checked={filters.employeeRanges.includes(range.id)}
                        onCheckedChange={() => toggleFilter("employeeRanges", range.id)}
                      />
                      <label
                        htmlFor={`size-${range.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {range.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Funding Stage */}
              <div>
                <Label className="text-sm font-medium">Funding Stage</Label>
                <div className="mt-2 space-y-2">
                  {APOLLO_FUNDING_STAGES.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`funding-${stage.id}`}
                        checked={filters.fundingStages.includes(stage.id)}
                        onCheckedChange={() => toggleFilter("fundingStages", stage.id)}
                      />
                      <label
                        htmlFor={`funding-${stage.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {stage.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seniority */}
              <div>
                <Label className="text-sm font-medium">Seniority</Label>
                <div className="mt-2 space-y-2">
                  {APOLLO_SENIORITIES.map((seniority) => (
                    <div key={seniority.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`seniority-${seniority.id}`}
                        checked={filters.seniorities.includes(seniority.id)}
                        onCheckedChange={() => toggleFilter("seniorities", seniority.id)}
                      />
                      <label
                        htmlFor={`seniority-${seniority.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {seniority.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Job Titles */}
              <div>
                <Label className="text-sm font-medium">Job Titles</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g., VP Engineering"
                    onKeyDown={(e) => e.key === "Enter" && addTitle()}
                  />
                  <Button size="icon" variant="outline" onClick={addTitle}>
                    +
                  </Button>
                </div>
                {filters.titles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {filters.titles.map((title) => (
                      <Badge
                        key={title}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTitle(title)}
                      >
                        {title} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className={showFilters ? "md:col-span-3" : "md:col-span-4"}>
          {results.length === 0 && !loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Search for Prospects</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Use the filters on the left to search for companies and contacts
                  that match your ideal customer profile.
                </p>
              </CardContent>
            </Card>
          ) : loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(totalResults)} prospects found
                  </p>
                  {selectedIds.size > 0 && (
                    <Badge>{selectedIds.size} selected</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">AI-scored for fit</span>
                </div>
              </div>

              {/* Results Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === results.length && results.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="h-4 w-4" />
                          Fit
                        </div>
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(result.id)}
                            onCheckedChange={() => toggleSelect(result.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>
                                {getInitials(`${result.first_name} ${result.last_name}`)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {result.first_name} {result.last_name}
                              </p>
                              {result.role_type && (
                                <Badge variant="outline" className="text-xs">
                                  {ROLE_TYPE_LABELS[result.role_type as keyof typeof ROLE_TYPE_LABELS]}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{result.organization.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {result.organization.industry} • {formatNumber(result.organization.estimated_num_employees)} employees
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{result.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {result.seniority}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${
                            (result.fit_score || 0) >= 80 ? "text-green-600" :
                            (result.fit_score || 0) >= 60 ? "text-yellow-600" :
                            "text-muted-foreground"
                          }`}>
                            {result.fit_score?.toFixed(0) || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {result.email ? (
                              <>
                                <span className="text-sm truncate max-w-[150px]">
                                  {result.email}
                                </span>
                                {result.email_status === "verified" && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {result.linkedin_url && (
                            <a
                              href={result.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Linkedin className="h-4 w-4" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Pagination */}
              {totalResults > 25 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {Math.ceil(totalResults / 25)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => {
                        setPage(p => p - 1)
                        handleSearch()
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * 25 >= totalResults}
                      onClick={() => {
                        setPage(p => p + 1)
                        handleSearch()
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
