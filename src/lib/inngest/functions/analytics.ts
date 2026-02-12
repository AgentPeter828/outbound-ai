import { inngest } from "../client"
import { createClient } from "@/lib/supabase/server"

/**
 * Generate daily analytics rollup
 */
export const dailyRollup = inngest.createFunction(
  {
    id: "analytics-daily-rollup",
    name: "Daily Analytics Rollup",
    retries: 3,
  },
  { event: "analytics/daily.rollup" },
  async ({ event, step }) => {
    const { workspace_id, date } = event.data

    const targetDate = new Date(date)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString()

    // Calculate email metrics
    const emailMetrics = await step.run("calc-email-metrics", async () => {
      const supabase = await createClient()

      const [sent, opened, replied, bounced] = await Promise.all([
        supabase
          .from("interactions")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .eq("type", "email_sent")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
        supabase
          .from("interactions")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .eq("type", "email_opened")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
        supabase
          .from("interactions")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .eq("type", "email_received")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
        supabase
          .from("interactions")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .eq("type", "email_bounced")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
      ])

      return {
        emails_sent: sent.count || 0,
        emails_opened: opened.count || 0,
        emails_replied: replied.count || 0,
        emails_bounced: bounced.count || 0,
        open_rate: sent.count ? ((opened.count || 0) / sent.count) * 100 : 0,
        reply_rate: sent.count ? ((replied.count || 0) / sent.count) * 100 : 0,
      }
    })

    // Calculate pipeline metrics
    const pipelineMetrics = await step.run("calc-pipeline-metrics", async () => {
      const supabase = await createClient()

      const [newDeals, wonDeals, lostDeals, allDeals] = await Promise.all([
        supabase
          .from("deals")
          .select("value")
          .eq("workspace_id", workspace_id)
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
        supabase
          .from("deals")
          .select("value")
          .eq("workspace_id", workspace_id)
          .eq("stage", "closed_won")
          .gte("closed_at", startOfDay)
          .lte("closed_at", endOfDay),
        supabase
          .from("deals")
          .select("value")
          .eq("workspace_id", workspace_id)
          .eq("stage", "closed_lost")
          .gte("closed_at", startOfDay)
          .lte("closed_at", endOfDay),
        supabase
          .from("deals")
          .select("value, stage")
          .eq("workspace_id", workspace_id)
          .not("stage", "in", "(closed_won,closed_lost)"),
      ])

      const newValue = (newDeals.data || []).reduce((sum, d) => sum + (d.value || 0), 0)
      const wonValue = (wonDeals.data || []).reduce((sum, d) => sum + (d.value || 0), 0)
      const lostValue = (lostDeals.data || []).reduce((sum, d) => sum + (d.value || 0), 0)
      const pipelineValue = (allDeals.data || []).reduce((sum, d) => sum + (d.value || 0), 0)

      return {
        new_deals: newDeals.data?.length || 0,
        new_deal_value: newValue,
        won_deals: wonDeals.data?.length || 0,
        won_value: wonValue,
        lost_deals: lostDeals.data?.length || 0,
        lost_value: lostValue,
        pipeline_deals: allDeals.data?.length || 0,
        pipeline_value: pipelineValue,
      }
    })

    // Calculate meeting metrics
    const meetingMetrics = await step.run("calc-meeting-metrics", async () => {
      const supabase = await createClient()

      const { data: meetings, count } = await supabase
        .from("meetings")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspace_id)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay)

      const totalDuration = (meetings || []).reduce((sum, m) => {
        if (m.start_time && m.end_time) {
          const start = new Date(m.start_time).getTime()
          const end = new Date(m.end_time).getTime()
          return sum + (end - start) / 60000 // minutes
        }
        return sum
      }, 0)

      return {
        meetings_held: count || 0,
        total_duration_minutes: Math.round(totalDuration),
      }
    })

    // Calculate sequence metrics
    const sequenceMetrics = await step.run("calc-sequence-metrics", async () => {
      const supabase = await createClient()

      const [enrolled, completed, replied] = await Promise.all([
        supabase
          .from("sequence_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .gte("enrolled_at", startOfDay)
          .lte("enrolled_at", endOfDay),
        supabase
          .from("sequence_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .eq("status", "completed")
          .gte("completed_at", startOfDay)
          .lte("completed_at", endOfDay),
        supabase
          .from("sequence_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .eq("status", "replied")
          .gte("completed_at", startOfDay)
          .lte("completed_at", endOfDay),
      ])

      return {
        contacts_enrolled: enrolled.count || 0,
        sequences_completed: completed.count || 0,
        replies_received: replied.count || 0,
      }
    })

    // Store the rollup
    await step.run("store-rollup", async () => {
      const supabase = await createClient()

      await supabase.from("analytics_daily").upsert({
        workspace_id,
        date: date,
        ...emailMetrics,
        ...pipelineMetrics,
        ...meetingMetrics,
        ...sequenceMetrics,
      })
    })

    return {
      success: true,
      date,
      metrics: {
        email: emailMetrics,
        pipeline: pipelineMetrics,
        meeting: meetingMetrics,
        sequence: sequenceMetrics,
      },
    }
  }
)

/**
 * Score a deal based on signals
 */
export const dealScoring = inngest.createFunction(
  {
    id: "analytics-deal-scoring",
    name: "Score Deal",
    retries: 3,
  },
  { event: "analytics/deal.score" },
  async ({ event, step }) => {
    const { deal_id, workspace_id } = event.data

    // Get deal with related data
    const deal = await step.run("get-deal", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("deals")
        .select(`
          *,
          company:companies (*),
          contact:contacts (*)
        `)
        .eq("id", deal_id)
        .single()

      return data
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    // Get engagement signals
    const engagementSignals = await step.run("get-engagement", async () => {
      const supabase = await createClient()

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [emails, meetings, replies] = await Promise.all([
        supabase
          .from("interactions")
          .select("*", { count: "exact" })
          .eq("deal_id", deal_id)
          .eq("type", "email_sent")
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("meetings")
          .select("*", { count: "exact" })
          .eq("deal_id", deal_id)
          .gte("start_time", thirtyDaysAgo.toISOString()),
        supabase
          .from("interactions")
          .select("*", { count: "exact" })
          .eq("deal_id", deal_id)
          .eq("type", "email_received")
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ])

      return {
        emails_sent: emails.count || 0,
        meetings_held: meetings.count || 0,
        replies_received: replies.count || 0,
      }
    })

    // Calculate scores
    const scores = await step.run("calculate-scores", async () => {
      const company = deal.company as {
        employee_count: number
        annual_revenue: number
        funding_stage: string
      } | null

      // ICP Fit Score (0-100)
      let fitScore = 50 // Base score

      if (company) {
        // Employee count scoring
        if (company.employee_count >= 50 && company.employee_count <= 500) {
          fitScore += 20
        } else if (company.employee_count > 500 && company.employee_count <= 1000) {
          fitScore += 10
        }

        // Funding stage scoring
        if (["series_a", "series_b"].includes(company.funding_stage || "")) {
          fitScore += 20
        } else if (company.funding_stage === "seed") {
          fitScore += 10
        }
      }

      // Deal value scoring
      if ((deal.value || 0) >= 50000) {
        fitScore += 10
      }

      // Engagement Score (0-100)
      let engagementScore = 0

      // Email engagement
      if (engagementSignals.emails_sent > 0) {
        const replyRate = engagementSignals.replies_received / engagementSignals.emails_sent
        engagementScore += Math.min(replyRate * 100, 40)
      }

      // Meeting engagement
      engagementScore += Math.min(engagementSignals.meetings_held * 20, 40)

      // Recent activity bonus
      if (engagementSignals.replies_received > 0 || engagementSignals.meetings_held > 0) {
        engagementScore += 20
      }

      // Intent Score (0-100)
      let intentScore = 50 // Base score

      // Stage-based intent
      const stageIntentMap: Record<string, number> = {
        lead: 0,
        qualified: 20,
        meeting_booked: 40,
        proposal: 60,
        negotiation: 80,
      }
      intentScore += stageIntentMap[deal.stage] || 0

      // Normalize scores
      fitScore = Math.min(Math.max(fitScore, 0), 100)
      engagementScore = Math.min(Math.max(engagementScore, 0), 100)
      intentScore = Math.min(Math.max(intentScore, 0), 100)

      // Overall score (weighted average)
      const overallScore = Math.round(
        fitScore * 0.3 + engagementScore * 0.4 + intentScore * 0.3
      )

      return {
        fit_score: Math.round(fitScore),
        engagement_score: Math.round(engagementScore),
        intent_score: Math.round(intentScore),
        overall_score: overallScore,
      }
    })

    // Predict win probability
    const winProbability = await step.run("predict-win-probability", async () => {
      // Simple win probability based on scores and stage
      const stageProbabilities: Record<string, number> = {
        lead: 5,
        qualified: 15,
        meeting_booked: 30,
        proposal: 50,
        negotiation: 70,
      }

      const baseProbability = stageProbabilities[deal.stage] || 10

      // Adjust based on overall score
      const scoreAdjustment = (scores.overall_score - 50) * 0.3

      const probability = Math.min(Math.max(baseProbability + scoreAdjustment, 1), 95)

      return Math.round(probability)
    })

    // Update deal with scores
    await step.run("update-deal", async () => {
      const supabase = await createClient()

      await supabase
        .from("deals")
        .update({
          fit_score: scores.fit_score,
          engagement_score: scores.engagement_score,
          intent_score: scores.intent_score,
          win_probability: winProbability,
          metadata: {
            ...(deal.metadata as object || {}),
            last_scored_at: new Date().toISOString(),
            scoring_signals: engagementSignals,
          },
        })
        .eq("id", deal_id)
    })

    return {
      success: true,
      deal_id,
      scores,
      win_probability: winProbability,
    }
  }
)
