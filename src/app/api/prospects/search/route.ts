import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchPeople } from "@/lib/apollo"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      // Company filters
      industries,
      employee_count_min,
      employee_count_max,
      technologies,
      funding_stages,
      locations,
      keywords,
      // Person filters
      titles,
      seniority,
      departments,
      // Pagination
      page = 1,
      limit = 25,
    } = body

    // Search using Apollo
    const results = await apolloClient.searchPeople({
      person_titles: titles,
      person_seniority: seniority,
      person_departments: departments,
      organization_industry_tag_ids: industries,
      organization_num_employees_ranges: employee_count_min || employee_count_max
        ? [`${employee_count_min || 1}-${employee_count_max || 10000}`]
        : undefined,
      organization_latest_funding_stage_cd: funding_stages,
      q_organization_keyword_tags: keywords,
      per_page: limit,
      page,
    })

    // Track usage
    await supabase.from("usage_records").insert({
      workspace_id: membership.workspace_id,
      type: "prospect_search",
      quantity: 1,
      metadata: {
        results_count: results.people?.length || 0,
        filters: { industries, titles, employee_count_min, employee_count_max },
      },
    })

    // Transform Apollo response
    const prospects = (results.people || []).map((person: {
      id: string
      first_name: string
      last_name: string
      email: string
      title: string
      linkedin_url: string
      organization: {
        id: string
        name: string
        website_url: string
        industry: string
        estimated_num_employees: number
        annual_revenue: string
        founded_year: number
        linkedin_url: string
      }
    }) => ({
      id: person.id,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      title: person.title,
      linkedin_url: person.linkedin_url,
      company: person.organization ? {
        id: person.organization.id,
        name: person.organization.name,
        domain: person.organization.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        industry: person.organization.industry,
        employee_count: person.organization.estimated_num_employees,
        annual_revenue: person.organization.annual_revenue,
        founded_year: person.organization.founded_year,
        linkedin_url: person.organization.linkedin_url,
      } : null,
    }))

    return NextResponse.json({
      prospects,
      pagination: {
        page,
        limit,
        total: results.pagination?.total_entries || prospects.length,
        pages: results.pagination?.total_pages || 1,
      },
    })
  } catch (error) {
    console.error("Prospect search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
