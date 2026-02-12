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
    const filter = searchParams.get("filter") || "upcoming"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const now = new Date().toISOString()

    let query = supabase
      .from("meetings")
      .select(`
        *,
        contact:contacts (id, first_name, last_name, email, company:companies (name)),
        deal:deals (id, title, stage)
      `, { count: "exact" })
      .eq("workspace_id", membership.workspace_id)

    if (filter === "upcoming") {
      query = query.gte("start_time", now).order("start_time", { ascending: true })
    } else if (filter === "past") {
      query = query.lt("start_time", now).order("start_time", { ascending: false })
    }

    query = query.range((page - 1) * limit, page * limit - 1)

    const { data: meetings, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      meetings,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching meetings:", error)
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
      start_time,
      end_time,
      contact_id,
      deal_id,
      meeting_url,
      notes,
    } = body

    if (!title || !start_time) {
      return NextResponse.json({ error: "Title and start_time are required" }, { status: 400 })
    }

    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({
        workspace_id: membership.workspace_id,
        title,
        start_time,
        end_time,
        contact_id,
        deal_id,
        meeting_url,
        notes,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger pre-meeting prep generation if meeting is in the future
    const meetingTime = new Date(start_time)
    if (meetingTime > new Date()) {
      await inngest.send({
        name: "meeting/prep.generate",
        data: {
          meeting_id: meeting.id,
          workspace_id: membership.workspace_id,
        },
      })
    }

    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
