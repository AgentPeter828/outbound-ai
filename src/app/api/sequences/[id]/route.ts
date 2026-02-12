import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const { data: sequence, error } = await supabase
      .from("sequences")
      .select(`
        *,
        steps:sequence_steps (*),
        enrollments:sequence_enrollments (
          *,
          contact:contacts (id, first_name, last_name, email)
        )
      `)
      .eq("id", id)
      .eq("workspace_id", membership.workspace_id)
      .single()

    if (error || !sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    return NextResponse.json({ sequence })
  } catch (error) {
    console.error("Error fetching sequence:", error)
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
    const { steps, ...sequenceUpdates } = body

    // Update sequence
    if (Object.keys(sequenceUpdates).length > 0) {
      const { error: seqError } = await supabase
        .from("sequences")
        .update(sequenceUpdates)
        .eq("id", id)
        .eq("workspace_id", membership.workspace_id)

      if (seqError) {
        return NextResponse.json({ error: seqError.message }, { status: 500 })
      }
    }

    // Update steps if provided
    if (steps && Array.isArray(steps)) {
      // Delete existing steps
      await supabase
        .from("sequence_steps")
        .delete()
        .eq("sequence_id", id)

      // Insert new steps
      const stepsToInsert = steps.map((step: {
        step_number: number
        subject_template: string
        body_template: string
        delay_days: number
        variant?: string
      }, index: number) => ({
        sequence_id: id,
        step_number: step.step_number || index + 1,
        subject_template: step.subject_template,
        body_template: step.body_template,
        delay_days: step.delay_days || 0,
        variant: step.variant || "A",
      }))

      const { error: stepsError } = await supabase
        .from("sequence_steps")
        .insert(stepsToInsert)

      if (stepsError) {
        return NextResponse.json({ error: stepsError.message }, { status: 500 })
      }
    }

    // Fetch updated sequence
    const { data: sequence } = await supabase
      .from("sequences")
      .select(`
        *,
        steps:sequence_steps (*)
      `)
      .eq("id", id)
      .single()

    return NextResponse.json({ sequence })
  } catch (error) {
    console.error("Error updating sequence:", error)
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

    // Check for active enrollments
    const { count: activeEnrollments } = await supabase
      .from("sequence_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("sequence_id", id)
      .eq("status", "active")

    if ((activeEnrollments || 0) > 0) {
      return NextResponse.json({
        error: "Cannot delete sequence with active enrollments",
      }, { status: 400 })
    }

    const { error } = await supabase
      .from("sequences")
      .delete()
      .eq("id", id)
      .eq("workspace_id", membership.workspace_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sequence:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
