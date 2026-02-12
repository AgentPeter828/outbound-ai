import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sequenceId } = await params
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
    const { contact_ids } = body

    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return NextResponse.json({ error: "contact_ids array is required" }, { status: 400 })
    }

    // Verify sequence exists and is active
    const { data: sequence } = await supabase
      .from("sequences")
      .select("id, status")
      .eq("id", sequenceId)
      .eq("workspace_id", membership.workspace_id)
      .single()

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.status !== "active") {
      return NextResponse.json({ error: "Sequence is not active" }, { status: 400 })
    }

    // Check for existing enrollments
    const { data: existingEnrollments } = await supabase
      .from("sequence_enrollments")
      .select("contact_id")
      .eq("sequence_id", sequenceId)
      .in("contact_id", contact_ids)
      .in("status", ["active", "paused"])

    const existingContactIds = new Set(
      (existingEnrollments || []).map((e) => e.contact_id)
    )

    const newContactIds = contact_ids.filter(
      (id: string) => !existingContactIds.has(id)
    )

    if (newContactIds.length === 0) {
      return NextResponse.json({
        error: "All contacts are already enrolled in this sequence",
        skipped: contact_ids.length,
      }, { status: 400 })
    }

    // Create enrollments
    const enrollments = newContactIds.map((contactId: string) => ({
      workspace_id: membership.workspace_id,
      sequence_id: sequenceId,
      contact_id: contactId,
      status: "active",
      current_step: 1,
      enrolled_at: new Date().toISOString(),
    }))

    const { data: createdEnrollments, error } = await supabase
      .from("sequence_enrollments")
      .insert(enrollments)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger enrollment workflow for each contact
    for (const enrollment of createdEnrollments || []) {
      await inngest.send({
        name: "sequence/contact.enrolled",
        data: {
          enrollment_id: enrollment.id,
          contact_id: enrollment.contact_id,
          sequence_id: sequenceId,
          workspace_id: membership.workspace_id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      enrolled: newContactIds.length,
      skipped: contact_ids.length - newContactIds.length,
      enrollments: createdEnrollments,
    }, { status: 201 })
  } catch (error) {
    console.error("Error enrolling contacts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
