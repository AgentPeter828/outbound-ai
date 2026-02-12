import { inngest } from "../client"
import { createClient } from "@/lib/supabase/server"
import { generateEmail } from "@/lib/ai/anthropic"

/**
 * Enroll a contact in a sequence and schedule the first email
 */
export const enrollContact = inngest.createFunction(
  {
    id: "sequence-enroll-contact",
    name: "Enroll Contact in Sequence",
    retries: 3,
  },
  { event: "sequence/contact.enrolled" },
  async ({ event, step }) => {
    const { enrollment_id, contact_id, sequence_id, workspace_id } = event.data

    // Get sequence details
    const sequence = await step.run("get-sequence", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("sequences")
        .select("*, steps:sequence_steps(*)")
        .eq("id", sequence_id)
        .single()

      return data
    })

    if (!sequence || !sequence.steps || sequence.steps.length === 0) {
      throw new Error("Sequence not found or has no steps")
    }

    // Sort steps by step_number
    const sortedSteps = (sequence.steps as Array<{ step_number: number; delay_days: number }>)
      .sort((a, b) => a.step_number - b.step_number)

    const firstStep = sortedSteps[0]

    // Schedule the first email
    const sendAt = new Date()
    sendAt.setDate(sendAt.getDate() + firstStep.delay_days)

    await step.run("update-enrollment", async () => {
      const supabase = await createClient()

      await supabase
        .from("sequence_enrollments")
        .update({
          status: "active",
          current_step: 1,
          next_send_at: sendAt.toISOString(),
        })
        .eq("id", enrollment_id)
    })

    // Generate email content for first step
    await step.sendEvent("generate-email", {
      name: "ai/email.generate",
      data: {
        enrollment_id,
        step_number: 1,
        workspace_id,
      },
    })

    // Schedule the send
    await step.sleepUntil("wait-for-send-time", sendAt)

    // Trigger the send
    await step.sendEvent("send-first-step", {
      name: "sequence/step.send",
      data: {
        enrollment_id,
        step_number: 1,
        workspace_id,
      },
    })

    return { success: true, scheduled_for: sendAt.toISOString() }
  }
)

/**
 * Send a sequence step email
 */
export const sendStep = inngest.createFunction(
  {
    id: "sequence-send-step",
    name: "Send Sequence Step",
    throttle: {
      limit: 50,
      period: "1m",
    },
    retries: 3,
  },
  { event: "sequence/step.send" },
  async ({ event, step }) => {
    const { enrollment_id, step_number, workspace_id } = event.data

    // Get enrollment details
    const enrollment = await step.run("get-enrollment", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("sequence_enrollments")
        .select(`
          *,
          contact:contacts (*),
          sequence:sequences (
            *,
            steps:sequence_steps (*)
          )
        `)
        .eq("id", enrollment_id)
        .single()

      return data
    })

    if (!enrollment || enrollment.status !== "active") {
      return { success: false, reason: "Enrollment not active" }
    }

    const contact = enrollment.contact as {
      id: string
      email: string
      first_name: string
      last_name: string
    }

    const sequence = enrollment.sequence as {
      id: string
      name: string
      steps: Array<{
        step_number: number
        subject_template: string
        body_template: string
        delay_days: number
      }>
    }

    const currentStep = sequence.steps.find((s) => s.step_number === step_number)
    if (!currentStep) {
      return { success: false, reason: "Step not found" }
    }

    // Check for pending review (human-in-the-loop)
    const pendingEmail = await step.run("check-pending", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("pending_emails")
        .select("*")
        .eq("enrollment_id", enrollment_id)
        .eq("step_number", step_number)
        .eq("status", "approved")
        .single()

      return data
    })

    if (!pendingEmail) {
      // Email not approved yet, reschedule check
      await step.sleep("wait-for-approval", "1h")

      await step.sendEvent("retry-send", {
        name: "sequence/step.send",
        data: { enrollment_id, step_number, workspace_id },
      })

      return { success: false, reason: "Waiting for approval" }
    }

    // Send the email via Gmail API
    const sendResult = await step.run("send-email", async () => {
      // In production, this would use the Gmail API
      // For now, we'll simulate the send
      const supabase = await createClient()

      // Record the interaction
      await supabase.from("interactions").insert({
        workspace_id,
        contact_id: contact.id,
        type: "email_sent",
        subject: pendingEmail.subject,
        content: pendingEmail.body,
        metadata: {
          sequence_id: sequence.id,
          step_number,
          enrollment_id,
        },
      })

      // Update pending email status
      await supabase
        .from("pending_emails")
        .update({ status: "sent" })
        .eq("id", pendingEmail.id)

      return { sent: true, email: contact.email }
    })

    // Update enrollment for next step
    const nextStepNumber = step_number + 1
    const nextStep = sequence.steps.find((s) => s.step_number === nextStepNumber)

    if (nextStep) {
      // Schedule next step
      const nextSendAt = new Date()
      nextSendAt.setDate(nextSendAt.getDate() + nextStep.delay_days)

      await step.run("schedule-next-step", async () => {
        const supabase = await createClient()

        await supabase
          .from("sequence_enrollments")
          .update({
            current_step: nextStepNumber,
            next_send_at: nextSendAt.toISOString(),
          })
          .eq("id", enrollment_id)
      })

      // Generate email for next step
      await step.sendEvent("generate-next-email", {
        name: "ai/email.generate",
        data: {
          enrollment_id,
          step_number: nextStepNumber,
          workspace_id,
        },
      })

      // Schedule next send
      await step.sleepUntil("wait-for-next-send", nextSendAt)

      await step.sendEvent("send-next-step", {
        name: "sequence/step.send",
        data: {
          enrollment_id,
          step_number: nextStepNumber,
          workspace_id,
        },
      })
    } else {
      // Sequence complete
      await step.run("complete-sequence", async () => {
        const supabase = await createClient()

        await supabase
          .from("sequence_enrollments")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", enrollment_id)
      })
    }

    // Track usage
    await step.run("track-usage", async () => {
      const supabase = await createClient()

      await supabase.from("usage_records").insert({
        workspace_id,
        type: "email_sent",
        quantity: 1,
        metadata: { enrollment_id, step_number },
      })
    })

    return { success: true, sent_to: contact.email }
  }
)

/**
 * Process an incoming reply
 */
export const processReply = inngest.createFunction(
  {
    id: "sequence-process-reply",
    name: "Process Reply",
    retries: 3,
  },
  { event: "sequence/reply.received" },
  async ({ event, step }) => {
    const { interaction_id, contact_id, workspace_id } = event.data

    // Get the reply
    const interaction = await step.run("get-interaction", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("interactions")
        .select("*")
        .eq("id", interaction_id)
        .single()

      return data
    })

    if (!interaction) {
      throw new Error("Interaction not found")
    }

    // Classify the reply using AI
    await step.sendEvent("classify-reply", {
      name: "ai/reply.classify",
      data: {
        interaction_id,
        content: interaction.content || "",
        workspace_id,
      },
    })

    // Check if contact is in an active sequence
    const enrollment = await step.run("check-enrollment", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("sequence_enrollments")
        .select("*")
        .eq("contact_id", contact_id)
        .eq("status", "active")
        .single()

      return data
    })

    if (enrollment) {
      // Pause the sequence when reply received
      await step.run("pause-sequence", async () => {
        const supabase = await createClient()

        await supabase
          .from("sequence_enrollments")
          .update({
            status: "replied",
            completed_at: new Date().toISOString(),
          })
          .eq("id", enrollment.id)
      })
    }

    return { success: true, enrollment_paused: !!enrollment }
  }
)

/**
 * Check for bounced emails
 */
export const checkBounces = inngest.createFunction(
  {
    id: "sequence-check-bounces",
    name: "Check Email Bounces",
    retries: 2,
  },
  { event: "sequence/bounces.check" },
  async ({ event, step }) => {
    const { workspace_id } = event.data

    // In production, this would check Gmail API for bounces
    // and update contact records accordingly

    const bounces = await step.run("fetch-bounces", async () => {
      // Simulate checking for bounces
      return []
    })

    if (bounces.length > 0) {
      await step.run("process-bounces", async () => {
        const supabase = await createClient()

        for (const bounce of bounces) {
          // Update contact as bounced
          await supabase
            .from("contacts")
            .update({
              metadata: {
                bounced: true,
                bounce_date: new Date().toISOString(),
              },
            })
            .eq("email", (bounce as { email: string }).email)

          // Pause any active enrollments
          await supabase
            .from("sequence_enrollments")
            .update({ status: "bounced" })
            .eq("contact_id", (bounce as { contact_id: string }).contact_id)
        }
      })
    }

    return { success: true, bounces_processed: bounces.length }
  }
)
