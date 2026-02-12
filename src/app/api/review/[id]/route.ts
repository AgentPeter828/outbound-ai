import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

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
    const { action, subject, body: emailBody } = body

    if (!action || !["approve", "reject", "edit"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get current email
    const { data: pendingEmail } = await supabase
      .from("pending_emails")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", membership.workspace_id)
      .single()

    if (!pendingEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    if (action === "approve") {
      // Update status to approved
      const { error } = await supabase
        .from("pending_emails")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Trigger send step
      await inngest.send({
        name: "sequence/step.send",
        data: {
          enrollment_id: pendingEmail.enrollment_id,
          step_number: pendingEmail.step_number,
          workspace_id: membership.workspace_id,
        },
      })

      return NextResponse.json({ success: true, action: "approved" })
    }

    if (action === "reject") {
      // Update status to rejected and pause enrollment
      const { error } = await supabase
        .from("pending_emails")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Pause the enrollment
      await supabase
        .from("sequence_enrollments")
        .update({ status: "paused" })
        .eq("id", pendingEmail.enrollment_id)

      return NextResponse.json({ success: true, action: "rejected" })
    }

    if (action === "edit") {
      // Update email content
      const { error } = await supabase
        .from("pending_emails")
        .update({
          subject: subject || pendingEmail.subject,
          body: emailBody || pendingEmail.body,
          metadata: {
            ...(pendingEmail.metadata as object || {}),
            edited_at: new Date().toISOString(),
            edited_by: user.id,
          },
        })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: "edited" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
