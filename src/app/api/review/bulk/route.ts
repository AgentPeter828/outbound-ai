import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

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
    const { ids, action } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 })
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get pending emails
    const { data: pendingEmails } = await supabase
      .from("pending_emails")
      .select("*")
      .in("id", ids)
      .eq("workspace_id", membership.workspace_id)
      .eq("status", "pending")

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({ error: "No pending emails found" }, { status: 404 })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"

    // Update all emails
    const { error: updateError } = await supabase
      .from("pending_emails")
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .in("id", ids)
      .eq("workspace_id", membership.workspace_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (action === "approve") {
      // Trigger send for each approved email
      for (const email of pendingEmails) {
        await inngest.send({
          name: "sequence/step.send",
          data: {
            enrollment_id: email.enrollment_id,
            step_number: email.step_number,
            workspace_id: membership.workspace_id,
          },
        })
      }
    } else {
      // Pause enrollments for rejected emails
      const enrollmentIds = pendingEmails.map((e) => e.enrollment_id)
      await supabase
        .from("sequence_enrollments")
        .update({ status: "paused" })
        .in("id", enrollmentIds)
    }

    return NextResponse.json({
      success: true,
      action,
      processed: pendingEmails.length,
    })
  } catch (error) {
    console.error("Error processing bulk review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
