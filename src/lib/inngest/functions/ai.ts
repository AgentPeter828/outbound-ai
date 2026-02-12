import { inngest } from "../client"
import { createClient } from "@/lib/supabase/server"
import { generateOutreachEmail } from "@/lib/ai/anthropic"
import { classifyReply as classifyWithKimi } from "@/lib/ai/openrouter"
import { checkSpam } from "@/lib/ai/groq"

/**
 * Generate personalized email for a sequence step
 */
export const generateEmail = inngest.createFunction(
  {
    id: "ai-generate-email",
    name: "Generate Email",
    throttle: {
      limit: 30,
      period: "1m",
    },
    retries: 3,
  },
  { event: "ai/email.generate" },
  async ({ event, step }) => {
    const { enrollment_id, step_number, workspace_id } = event.data

    // Get enrollment with all context
    const enrollment = await step.run("get-enrollment", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("sequence_enrollments")
        .select(`
          *,
          contact:contacts (
            *,
            company:companies (*)
          ),
          sequence:sequences (
            *,
            steps:sequence_steps (*)
          )
        `)
        .eq("id", enrollment_id)
        .single()

      return data
    })

    if (!enrollment) {
      throw new Error("Enrollment not found")
    }

    const contact = enrollment.contact as {
      id: string
      first_name: string
      last_name: string
      title: string
      email: string
      company: {
        name: string
        industry: string
        employee_count: number
        technologies: string[]
      } | null
    }

    const sequence = enrollment.sequence as {
      id: string
      name: string
      goal: string
      steps: Array<{
        step_number: number
        subject_template: string
        body_template: string
        variant: string
      }>
    }

    const currentStep = sequence.steps.find((s) => s.step_number === step_number)
    if (!currentStep) {
      throw new Error("Step not found")
    }

    // Get previous emails in this sequence
    const previousEmails = await step.run("get-previous-emails", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("interactions")
        .select("*")
        .eq("contact_id", contact.id)
        .eq("type", "email_sent")
        .order("created_at", { ascending: true })
        .limit(step_number - 1)

      return data || []
    })

    // Generate email using Claude
    const emailContent = await step.run("generate-with-claude", async () => {
      const context = {
        contact: {
          firstName: contact.first_name,
          lastName: contact.last_name,
          title: contact.title,
          email: contact.email,
        },
        company: contact.company ? {
          name: contact.company.name,
          industry: contact.company.industry,
          size: contact.company.employee_count,
          technologies: contact.company.technologies || [],
        } : undefined,
        sequence: {
          name: sequence.name,
          goal: sequence.goal,
          stepNumber: step_number,
          totalSteps: sequence.steps.length,
        },
        template: {
          subject: currentStep.subject_template,
          body: currentStep.body_template,
        },
        previousEmails: previousEmails.map((e) => ({
          subject: e.subject,
          sentAt: e.created_at,
        })),
      }

      return await generateOutreachEmail(context)
    })

    // Check for spam score
    const spamCheck = await step.run("check-spam", async () => {
      return await checkSpam(emailContent.body, emailContent.subject)
    })

    // Calculate AI confidence based on spam score and personalization
    const aiConfidence = await step.run("calc-confidence", async () => {
      let confidence = 95

      // Reduce confidence based on spam score
      confidence -= spamCheck.score * 5

      // Reduce if company info is missing
      if (!contact.company) {
        confidence -= 10
      }

      // Reduce for later steps in sequence
      if (step_number > 3) {
        confidence -= 5
      }

      return Math.max(confidence, 50)
    })

    // Create pending email for review
    await step.run("create-pending-email", async () => {
      const supabase = await createClient()

      await supabase.from("pending_emails").insert({
        workspace_id,
        enrollment_id,
        contact_id: contact.id,
        sequence_id: sequence.id,
        step_number,
        subject: emailContent.subject,
        body: emailContent.body,
        ai_confidence: aiConfidence,
        spam_score: spamCheck.score,
        status: aiConfidence >= 90 ? "approved" : "pending", // Auto-approve high confidence
        metadata: {
          generation_model: "claude-sonnet-4",
          spam_check: spamCheck,
          generated_at: new Date().toISOString(),
        },
      })
    })

    // Track usage
    await step.run("track-usage", async () => {
      const supabase = await createClient()

      await supabase.from("usage_records").insert({
        workspace_id,
        type: "ai_generation",
        quantity: 1,
        metadata: {
          enrollment_id,
          step_number,
          model: "claude-sonnet-4",
        },
      })
    })

    return {
      success: true,
      enrollment_id,
      step_number,
      ai_confidence: aiConfidence,
      auto_approved: aiConfidence >= 90,
    }
  }
)

/**
 * Classify an incoming reply
 */
export const classifyReply = inngest.createFunction(
  {
    id: "ai-classify-reply",
    name: "Classify Reply",
    throttle: {
      limit: 100,
      period: "1m",
    },
    retries: 3,
  },
  { event: "ai/reply.classify" },
  async ({ event, step }) => {
    const { interaction_id, content, workspace_id } = event.data

    // Classify using Kimi K2
    const classification = await step.run("classify-with-kimi", async () => {
      return await classifyWithKimi(content)
    })

    // Get sentiment
    const sentiment = await step.run("analyze-sentiment", async () => {
      // Simple sentiment analysis based on classification
      const sentimentMap: Record<string, string> = {
        interested: "positive",
        not_interested: "negative",
        objection: "neutral",
        out_of_office: "neutral",
        wrong_person: "neutral",
        unsubscribe: "negative",
        meeting_request: "positive",
        question: "neutral",
      }

      return sentimentMap[classification.category] || "neutral"
    })

    // Generate AI summary
    const aiSummary = await step.run("generate-summary", async () => {
      const summaryMap: Record<string, string> = {
        interested: "The prospect has expressed interest and may be ready to schedule a meeting.",
        not_interested: "The prospect has indicated they are not interested at this time.",
        objection: "The prospect has raised concerns that should be addressed.",
        out_of_office: "The prospect is currently out of office. Consider following up later.",
        wrong_person: "This may not be the right contact. Consider asking for a referral.",
        unsubscribe: "The prospect has requested to be removed from communications.",
        meeting_request: "The prospect wants to schedule a meeting.",
        question: "The prospect has questions that need to be answered.",
      }

      return summaryMap[classification.category] || "Review this reply to determine next steps."
    })

    // Generate suggested reply
    const suggestedReply = await step.run("generate-suggested-reply", async () => {
      const replyTemplates: Record<string, string> = {
        interested: `Thank you for your interest! I'd love to find a time to chat. Would any of these times work for a quick 15-minute call?\n\n[Insert calendar link]\n\nLooking forward to connecting!`,
        meeting_request: `Great, I'd be happy to set up a meeting! Here's my calendar link to find a time that works:\n\n[Insert calendar link]\n\nLooking forward to it!`,
        objection: `I appreciate you sharing that concern. Many of our customers had similar questions initially. Let me address that...\n\n[Address specific objection]\n\nWould you be open to a quick call to discuss further?`,
        question: `Great question! [Answer the specific question]\n\nDoes that help clarify things? Happy to jump on a quick call if you'd like to discuss further.`,
        out_of_office: null,
        not_interested: null,
        wrong_person: `Thank you for letting me know. Could you point me to the right person to speak with about [topic]?\n\nI appreciate your help!`,
        unsubscribe: null,
      }

      return replyTemplates[classification.category] || null
    })

    // Update the interaction
    await step.run("update-interaction", async () => {
      const supabase = await createClient()

      await supabase
        .from("interactions")
        .update({
          sentiment,
          metadata: {
            classification: classification.category,
            confidence: classification.confidence,
            ai_summary: aiSummary,
            suggested_reply: suggestedReply,
            classified_at: new Date().toISOString(),
          },
        })
        .eq("id", interaction_id)
    })

    // Track usage
    await step.run("track-usage", async () => {
      const supabase = await createClient()

      await supabase.from("usage_records").insert({
        workspace_id,
        type: "ai_classification",
        quantity: 1,
        metadata: {
          interaction_id,
          classification: classification.category,
        },
      })
    })

    return {
      success: true,
      interaction_id,
      classification: classification.category,
      sentiment,
      has_suggested_reply: !!suggestedReply,
    }
  }
)

/**
 * Score a lead based on ICP fit
 */
export const scoreLead = inngest.createFunction(
  {
    id: "ai-score-lead",
    name: "Score Lead",
    throttle: {
      limit: 50,
      period: "1m",
    },
    retries: 3,
  },
  { event: "ai/lead.score" },
  async ({ event, step }) => {
    const { contact_id, workspace_id } = event.data

    // Get contact with company data
    const contact = await step.run("get-contact", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("contacts")
        .select(`
          *,
          company:companies (*)
        `)
        .eq("id", contact_id)
        .single()

      return data
    })

    if (!contact) {
      throw new Error("Contact not found")
    }

    const company = contact.company as {
      id: string
      name: string
      industry: string
      employee_count: number
      annual_revenue: number
      funding_stage: string
      technologies: string[]
    } | null

    // Get workspace ICP criteria
    const icpCriteria = await step.run("get-icp", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("workspaces")
        .select("icp_criteria")
        .eq("id", workspace_id)
        .single()

      return (data?.icp_criteria as {
        industries?: string[]
        min_employees?: number
        max_employees?: number
        funding_stages?: string[]
        technologies?: string[]
        titles?: string[]
        seniority?: string[]
      }) || {}
    })

    // Calculate ICP fit score
    const scores = await step.run("calculate-scores", async () => {
      let fitScore = 50 // Base score

      if (company) {
        // Industry match
        if (icpCriteria.industries?.includes(company.industry)) {
          fitScore += 20
        }

        // Employee count match
        const minEmp = icpCriteria.min_employees || 0
        const maxEmp = icpCriteria.max_employees || Infinity
        if (company.employee_count >= minEmp && company.employee_count <= maxEmp) {
          fitScore += 15
        }

        // Funding stage match
        if (icpCriteria.funding_stages?.includes(company.funding_stage)) {
          fitScore += 15
        }

        // Technology match
        const techOverlap = (company.technologies || []).filter((t) =>
          (icpCriteria.technologies || []).includes(t)
        ).length
        fitScore += Math.min(techOverlap * 5, 15)
      }

      // Title/seniority match
      if (icpCriteria.titles?.some((t) => contact.title?.toLowerCase().includes(t.toLowerCase()))) {
        fitScore += 10
      }
      if (icpCriteria.seniority?.includes(contact.seniority)) {
        fitScore += 10
      }

      // Intent score (based on available signals)
      let intentScore = 30 // Base score

      // Will be updated with engagement data later

      return {
        fit_score: Math.min(Math.max(fitScore, 0), 100),
        intent_score: Math.min(Math.max(intentScore, 0), 100),
      }
    })

    // Update contact with scores
    await step.run("update-contact", async () => {
      const supabase = await createClient()

      await supabase
        .from("contacts")
        .update({
          lead_score: Math.round((scores.fit_score + scores.intent_score) / 2),
          metadata: {
            ...(contact.metadata as object || {}),
            fit_score: scores.fit_score,
            intent_score: scores.intent_score,
            scored_at: new Date().toISOString(),
          },
        })
        .eq("id", contact_id)
    })

    // Update company if present
    if (company) {
      await step.run("update-company", async () => {
        const supabase = await createClient()

        await supabase
          .from("companies")
          .update({
            fit_score: scores.fit_score,
            intent_score: scores.intent_score,
          })
          .eq("id", company.id)
      })
    }

    return {
      success: true,
      contact_id,
      scores,
    }
  }
)

/**
 * Check email content for spam signals
 */
export const spamCheck = inngest.createFunction(
  {
    id: "ai-spam-check",
    name: "Spam Check",
    throttle: {
      limit: 100,
      period: "1m",
    },
    retries: 2,
  },
  { event: "ai/spam.check" },
  async ({ event, step }) => {
    const { email_content, subject } = event.data

    // Check with Groq for fast spam analysis
    const result = await step.run("check-spam", async () => {
      return await checkSpam(email_content, subject)
    })

    return {
      success: true,
      spam_score: result.score,
      flags: result.flags,
      is_safe: result.score < 3,
    }
  }
)
