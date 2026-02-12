import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const status = searchParams.get("status")

    let query = supabase
      .from("sequences")
      .select(`
        *,
        steps:sequence_steps (count),
        enrollments:sequence_enrollments (count)
      `)
      .eq("workspace_id", membership.workspace_id)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data: sequences, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sequences })
  } catch (error) {
    console.error("Error fetching sequences:", error)
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
      description,
      goal,
      steps = [],
      settings = {},
    } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Create sequence
    const { data: sequence, error: seqError } = await supabase
      .from("sequences")
      .insert({
        workspace_id: membership.workspace_id,
        name,
        description,
        goal,
        settings,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .single()

    if (seqError) {
      return NextResponse.json({ error: seqError.message }, { status: 500 })
    }

    // Create steps if provided
    if (steps.length > 0) {
      const stepsToInsert = steps.map((step: {
        step_number: number
        subject_template: string
        body_template: string
        delay_days: number
        variant?: string
      }, index: number) => ({
        sequence_id: sequence.id,
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
        // Rollback sequence creation
        await supabase.from("sequences").delete().eq("id", sequence.id)
        return NextResponse.json({ error: stepsError.message }, { status: 500 })
      }
    }

    // Fetch complete sequence with steps
    const { data: completeSequence } = await supabase
      .from("sequences")
      .select(`
        *,
        steps:sequence_steps (*)
      `)
      .eq("id", sequence.id)
      .single()

    return NextResponse.json({ sequence: completeSequence }, { status: 201 })
  } catch (error) {
    console.error("Error creating sequence:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
