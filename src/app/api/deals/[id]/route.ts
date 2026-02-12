import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: deal, error } = await supabase
      .from("deals")
      .select(`
        *,
        company:companies (*),
        contact:contacts (*),
        interactions (*),
        meetings (*)
      `)
      .eq("id", id)
      .eq("workspace_id", membership.workspace_id)
      .single()

    if (error || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json({ deal })
  } catch (error) {
    console.error("Error fetching deal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const { stage, ...rest } = body

    // Get current deal to check for stage change
    const { data: currentDeal } = await supabase
      .from("deals")
      .select("stage")
      .eq("id", id)
      .single()

    const updates: Record<string, unknown> = { ...rest }

    if (stage) {
      updates.stage = stage
      // Set closed_at if moving to closed stage
      if (["closed_won", "closed_lost"].includes(stage) && currentDeal?.stage !== stage) {
        updates.closed_at = new Date().toISOString()
      }
    }

    const { data: deal, error } = await supabase
      .from("deals")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", membership.workspace_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Re-score deal if stage changed
    if (stage && currentDeal?.stage !== stage) {
      await inngest.send({
        name: "analytics/deal.score",
        data: {
          deal_id: id,
          workspace_id: membership.workspace_id,
        },
      })
    }

    return NextResponse.json({ deal })
  } catch (error) {
    console.error("Error updating deal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", id)
      .eq("workspace_id", membership.workspace_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting deal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
