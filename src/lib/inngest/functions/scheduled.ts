import { inngest } from "../client"
import { createClient } from "@/lib/supabase/server"

/**
 * Daily analytics rollup - runs at midnight UTC
 */
export const scheduledDailyRollup = inngest.createFunction(
  {
    id: "scheduled-daily-rollup",
    name: "Scheduled Daily Analytics Rollup",
  },
  { cron: "0 0 * * *" }, // Midnight UTC daily
  async ({ step }) => {
    // Get all active workspaces
    const workspaces = await step.run("get-workspaces", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("workspaces")
        .select("id")

      return data || []
    })

    // Trigger rollup for each workspace
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split("T")[0]

    await step.run("trigger-rollups", async () => {
      for (const workspace of workspaces) {
        await inngest.send({
          name: "analytics/daily.rollup",
          data: {
            workspace_id: workspace.id,
            date: dateStr,
          },
        })
      }
    })

    return {
      success: true,
      workspaces_processed: workspaces.length,
      date: dateStr,
    }
  }
)

/**
 * Scheduled bounce check - runs every 4 hours
 */
export const scheduledBounceCheck = inngest.createFunction(
  {
    id: "scheduled-bounce-check",
    name: "Scheduled Email Bounce Check",
  },
  { cron: "0 */4 * * *" }, // Every 4 hours
  async ({ step }) => {
    // Get all active workspaces with Gmail integration
    const workspaces = await step.run("get-workspaces", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("workspace_integrations")
        .select("workspace_id")
        .eq("provider", "gmail")
        .eq("status", "active")

      return data || []
    })

    // Trigger bounce check for each workspace
    await step.run("trigger-checks", async () => {
      for (const workspace of workspaces) {
        await inngest.send({
          name: "sequence/bounces.check",
          data: {
            workspace_id: workspace.workspace_id,
          },
        })
      }
    })

    return {
      success: true,
      workspaces_checked: workspaces.length,
    }
  }
)

/**
 * Scheduled pre-meeting prep - runs hourly
 */
export const scheduledMeetingPrep = inngest.createFunction(
  {
    id: "scheduled-meeting-prep",
    name: "Scheduled Pre-Meeting Prep Generation",
  },
  { cron: "0 * * * *" }, // Every hour
  async ({ step }) => {
    // Find meetings happening in the next 2 hours without prep
    const upcomingMeetings = await step.run("get-upcoming-meetings", async () => {
      const supabase = await createClient()

      const now = new Date()
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

      const { data } = await supabase
        .from("meetings")
        .select("id, workspace_id, metadata")
        .gte("start_time", now.toISOString())
        .lte("start_time", twoHoursLater.toISOString())

      // Filter out meetings that already have prep notes
      return (data || []).filter((m) => {
        const metadata = m.metadata as { prep_notes?: string } | null
        return !metadata?.prep_notes
      })
    })

    // Trigger prep generation for each meeting
    await step.run("trigger-prep", async () => {
      for (const meeting of upcomingMeetings) {
        await inngest.send({
          name: "meeting/prep.generate",
          data: {
            meeting_id: meeting.id,
            workspace_id: meeting.workspace_id,
          },
        })
      }
    })

    return {
      success: true,
      meetings_prepped: upcomingMeetings.length,
    }
  }
)

/**
 * Scheduled deal scoring - runs daily at 2 AM UTC
 */
export const scheduledDealScoring = inngest.createFunction(
  {
    id: "scheduled-deal-scoring",
    name: "Scheduled Deal Scoring",
  },
  { cron: "0 2 * * *" }, // 2 AM UTC daily
  async ({ step }) => {
    // Get all active deals
    const deals = await step.run("get-active-deals", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("deals")
        .select("id, workspace_id")
        .not("stage", "in", "(closed_won,closed_lost)")

      return data || []
    })

    // Trigger scoring for each deal
    await step.run("trigger-scoring", async () => {
      for (const deal of deals) {
        await inngest.send({
          name: "analytics/deal.score",
          data: {
            deal_id: deal.id,
            workspace_id: deal.workspace_id,
          },
        })
      }
    })

    return {
      success: true,
      deals_scored: deals.length,
    }
  }
)

/**
 * Scheduled sequence sending - runs every 15 minutes
 */
export const scheduledSequenceSend = inngest.createFunction(
  {
    id: "scheduled-sequence-send",
    name: "Scheduled Sequence Email Sending",
  },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async ({ step }) => {
    // Find enrollments ready to send
    const readyEnrollments = await step.run("get-ready-enrollments", async () => {
      const supabase = await createClient()

      const now = new Date().toISOString()

      const { data } = await supabase
        .from("sequence_enrollments")
        .select("id, current_step, workspace_id")
        .eq("status", "active")
        .lte("next_send_at", now)
        .limit(100)

      return data || []
    })

    // Trigger sending for each enrollment
    await step.run("trigger-sends", async () => {
      for (const enrollment of readyEnrollments) {
        await inngest.send({
          name: "sequence/step.send",
          data: {
            enrollment_id: enrollment.id,
            step_number: enrollment.current_step,
            workspace_id: enrollment.workspace_id,
          },
        })
      }
    })

    return {
      success: true,
      emails_triggered: readyEnrollments.length,
    }
  }
)
