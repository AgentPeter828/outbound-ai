import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

// Gmail push notification webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Gmail sends base64 encoded data
    const { message } = body
    if (!message?.data) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
    }

    // Decode the message data
    const decodedData = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf-8")
    )

    const { emailAddress, historyId } = decodedData

    if (!emailAddress) {
      return NextResponse.json({ error: "Missing email address" }, { status: 400 })
    }

    const supabase = await createClient()

    // Find workspace by connected email
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("workspace_id, metadata")
      .eq("provider", "gmail")
      .eq("status", "active")
      .contains("metadata", { email: emailAddress })
      .single()

    if (!integration) {
      console.log("No integration found for email:", emailAddress)
      return NextResponse.json({ success: true }) // ACK even if not found
    }

    // In production, fetch new messages using Gmail API
    // For now, we'll create a simulated incoming email interaction

    // This would be the actual implementation:
    // 1. Use historyId to fetch new messages since last sync
    // 2. For each new received email, check if it's a reply to a sent email
    // 3. If reply, create interaction and trigger classification

    // Simulated new email processing
    const simulatedEmail = {
      from: "prospect@example.com",
      subject: "Re: Your outreach",
      body: "Thanks for reaching out! I'd love to learn more.",
      messageId: `msg-${Date.now()}`,
      threadId: `thread-${Date.now()}`,
      receivedAt: new Date().toISOString(),
    }

    // Find contact by email
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", integration.workspace_id)
      .eq("email", simulatedEmail.from)
      .single()

    if (contact) {
      // Create interaction
      const { data: interaction } = await supabase
        .from("interactions")
        .insert({
          workspace_id: integration.workspace_id,
          contact_id: contact.id,
          type: "email_received",
          subject: simulatedEmail.subject,
          content: simulatedEmail.body,
          metadata: {
            message_id: simulatedEmail.messageId,
            thread_id: simulatedEmail.threadId,
          },
        })
        .select()
        .single()

      if (interaction) {
        // Trigger reply processing
        await inngest.send({
          name: "sequence/reply.received",
          data: {
            interaction_id: interaction.id,
            contact_id: contact.id,
            workspace_id: integration.workspace_id,
          },
        })
      }
    }

    // Update last sync history ID
    await supabase
      .from("workspace_integrations")
      .update({
        metadata: {
          ...(integration.metadata as object),
          last_history_id: historyId,
          last_sync_at: new Date().toISOString(),
        },
      })
      .eq("workspace_id", integration.workspace_id)
      .eq("provider", "gmail")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Gmail webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
