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
    const stage = searchParams.get("stage")
    const view = searchParams.get("view") || "list"

    let query = supabase
      .from("deals")
      .select(`
        *,
        company:companies (id, name, domain),
        contact:contacts (id, first_name, last_name, email)
      `, { count: "exact" })
      .eq("workspace_id", membership.workspace_id)
      .order("created_at", { ascending: false })

    if (stage) {
      query = query.eq("stage", stage)
    }

    if (view === "list") {
      query = query.range((page - 1) * limit, page * limit - 1)
    }

    const { data: deals, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // For kanban view, group by stage
    if (view === "kanban") {
      const stages = ["lead", "qualified", "meeting_booked", "proposal", "negotiation", "closed_won", "closed_lost"]
      const kanbanData = stages.reduce((acc, s) => {
        acc[s] = (deals || []).filter((d) => d.stage === s)
        return acc
      }, {} as Record<string, typeof deals>)

      return NextResponse.json({ deals: kanbanData, view: "kanban" })
    }

    return NextResponse.json({
      deals,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching deals:", error)
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
      title,
      value,
      stage = "lead",
      company_id,
      contact_id,
      expected_close_date,
      notes,
    } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const { data: deal, error } = await supabase
      .from("deals")
      .insert({
        workspace_id: membership.workspace_id,
        title,
        value: value || 0,
        stage,
        company_id,
        contact_id,
        expected_close_date,
        notes,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger deal scoring
    await inngest.send({
      name: "analytics/deal.score",
      data: {
        deal_id: deal.id,
        workspace_id: membership.workspace_id,
      },
    })

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error("Error creating deal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
