import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const industry = searchParams.get("industry")
    const minFitScore = searchParams.get("min_fit_score")

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" })
      .eq("workspace_id", membership.workspace_id)
      .order("fit_score", { ascending: false, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`)
    }

    if (industry) {
      query = query.eq("industry", industry)
    }

    if (minFitScore) {
      query = query.gte("fit_score", parseInt(minFitScore))
    }

    const { data: companies, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching companies:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
      name,
      domain,
      industry,
      employee_count,
      annual_revenue,
      description,
      enrich = true,
    } = body

    if (!name || !domain) {
      return NextResponse.json({ error: "Name and domain are required" }, { status: 400 })
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("workspace_id", membership.workspace_id)
      .eq("domain", domain)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Company with this domain already exists" }, { status: 409 })
    }

    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        workspace_id: membership.workspace_id,
        name,
        domain,
        industry,
        employee_count,
        annual_revenue,
        description,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger enrichment if requested
    if (enrich) {
      await inngest.send({
        name: "enrichment/company.enrich",
        data: {
          company_id: company.id,
          domain: company.domain,
          workspace_id: membership.workspace_id,
        },
      })
    }

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    console.error("Error creating company:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
