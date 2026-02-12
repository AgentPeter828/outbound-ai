import { inngest } from "../client"
import { createClient } from "@/lib/supabase/server"
import { generateMeetingSummary } from "@/lib/ai/anthropic"

/**
 * Generate pre-meeting prep notes
 */
export const preMeetingPrep = inngest.createFunction(
  {
    id: "meeting-pre-prep",
    name: "Generate Pre-Meeting Prep",
    retries: 3,
  },
  { event: "meeting/prep.generate" },
  async ({ event, step }) => {
    const { meeting_id, workspace_id } = event.data

    // Get meeting details with contact and deal info
    const meeting = await step.run("get-meeting", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("meetings")
        .select(`
          *,
          contact:contacts (
            *,
            company:companies (*)
          ),
          deal:deals (*)
        `)
        .eq("id", meeting_id)
        .single()

      return data
    })

    if (!meeting) {
      throw new Error("Meeting not found")
    }

    const contact = meeting.contact as {
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
    } | null

    const deal = meeting.deal as {
      id: string
      title: string
      stage: string
      value: number
    } | null

    // Get recent interactions with contact
    const recentInteractions = await step.run("get-interactions", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("interactions")
        .select("*")
        .eq("contact_id", contact?.id)
        .order("created_at", { ascending: false })
        .limit(10)

      return data || []
    })

    // Get previous meetings with contact
    const previousMeetings = await step.run("get-previous-meetings", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("contact_id", contact?.id)
        .neq("id", meeting_id)
        .order("start_time", { ascending: false })
        .limit(5)

      return data || []
    })

    // Generate prep notes using AI
    const prepNotes = await step.run("generate-prep", async () => {
      const context = {
        contact: contact ? {
          name: `${contact.first_name} ${contact.last_name}`,
          title: contact.title,
          company: contact.company?.name,
          industry: contact.company?.industry,
        } : null,
        deal: deal ? {
          title: deal.title,
          stage: deal.stage,
          value: deal.value,
        } : null,
        recent_emails: recentInteractions.slice(0, 5).map((i) => ({
          date: i.created_at,
          type: i.type,
          subject: i.subject,
          sentiment: i.sentiment,
        })),
        previous_meetings: previousMeetings.map((m) => ({
          date: m.start_time,
          title: m.title,
          summary: m.ai_summary,
        })),
      }

      // In production, this would call Claude to generate prep notes
      const prepContent = `
## Meeting Prep: ${meeting.title || 'Meeting with ' + (contact?.first_name || 'Contact')}

### Contact Overview
- **Name**: ${context.contact?.name || 'Unknown'}
- **Title**: ${context.contact?.title || 'Unknown'}
- **Company**: ${context.contact?.company || 'Unknown'}
- **Industry**: ${context.contact?.industry || 'Unknown'}

### Deal Context
${context.deal ? `
- **Opportunity**: ${context.deal.title}
- **Stage**: ${context.deal.stage}
- **Value**: $${context.deal.value?.toLocaleString() || 0}
` : 'No active deal associated with this meeting.'}

### Recent Communication Summary
${context.recent_emails.length > 0
  ? context.recent_emails.map(e => `- ${e.date}: ${e.subject || e.type}`).join('\n')
  : 'No recent email communication.'}

### Previous Meetings
${context.previous_meetings.length > 0
  ? context.previous_meetings.map(m => `- ${m.date}: ${m.title || 'Meeting'}`).join('\n')
  : 'No previous meetings recorded.'}

### Suggested Talking Points
1. Follow up on any outstanding action items from previous conversations
2. Understand current challenges and priorities
3. Present relevant solution capabilities
4. Discuss next steps and timeline

### Questions to Ask
1. What are your top priorities for this quarter?
2. What challenges are you currently facing with [relevant topic]?
3. How does your decision-making process work?
4. What would success look like for you?
`

      return prepContent
    })

    // Save prep notes
    await step.run("save-prep", async () => {
      const supabase = await createClient()

      await supabase
        .from("meetings")
        .update({
          metadata: {
            ...(meeting.metadata as object || {}),
            prep_notes: prepNotes,
            prep_generated_at: new Date().toISOString(),
          },
        })
        .eq("id", meeting_id)
    })

    // Track usage
    await step.run("track-usage", async () => {
      const supabase = await createClient()

      await supabase.from("usage_records").insert({
        workspace_id,
        type: "ai_generation",
        quantity: 1,
        metadata: { meeting_id, type: "prep_notes" },
      })
    })

    return { success: true, meeting_id }
  }
)

/**
 * Process meeting recording - transcribe and analyze
 */
export const postMeetingProcess = inngest.createFunction(
  {
    id: "meeting-post-process",
    name: "Process Meeting Recording",
    retries: 3,
  },
  { event: "meeting/recording.process" },
  async ({ event, step }) => {
    const { meeting_id, recording_url, workspace_id } = event.data

    // Get meeting details
    const meeting = await step.run("get-meeting", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("meetings")
        .select(`
          *,
          contact:contacts (*),
          deal:deals (*)
        `)
        .eq("id", meeting_id)
        .single()

      return data
    })

    if (!meeting) {
      throw new Error("Meeting not found")
    }

    // Transcribe the recording using Deepgram
    const transcript = await step.run("transcribe-recording", async () => {
      // In production, this would call Deepgram API
      // For now, return a simulated transcript
      return `[00:00] Host: Welcome, thanks for joining today's call.
[00:15] Guest: Thanks for having me. I'm excited to learn more about your solution.
[02:30] Host: Let me walk you through our key features...
[10:45] Guest: That's impressive. How does pricing work?
[15:20] Host: We offer flexible plans based on usage...
[25:00] Guest: I think this could really help our team. What are the next steps?
[28:30] Host: Great! Let me send over a proposal...
[30:00] Host: Thanks again for your time today.`
    })

    // Save transcript
    await step.run("save-transcript", async () => {
      const supabase = await createClient()

      await supabase
        .from("meetings")
        .update({
          transcript,
          recording_url,
        })
        .eq("id", meeting_id)
    })

    // Generate AI summary
    const aiSummary = await step.run("generate-summary", async () => {
      return await generateMeetingSummary(transcript)
    })

    // Analyze sentiment
    const sentimentAnalysis = await step.run("analyze-sentiment", async () => {
      // In production, this would use AI to analyze sentiment throughout
      return {
        overall: "positive",
        moments: [
          { timestamp: "02:30", sentiment: "positive", topic: "Product demo" },
          { timestamp: "10:45", sentiment: "positive", topic: "Pricing discussion" },
          { timestamp: "25:00", sentiment: "positive", topic: "Next steps" },
        ],
      }
    })

    // Extract action items
    const actionItems = await step.run("extract-actions", async () => {
      // In production, AI would extract these from transcript
      return [
        { item: "Send proposal document", owner: "Host", completed: false },
        { item: "Schedule follow-up demo with technical team", owner: "Host", completed: false },
        { item: "Review proposal and provide feedback", owner: "Guest", completed: false },
      ]
    })

    // Determine suggested stage based on conversation
    const suggestedStage = await step.run("suggest-stage", async () => {
      // In production, AI would analyze the conversation and suggest
      // Based on "next steps" discussion, suggest moving to proposal stage
      return "proposal"
    })

    // Update meeting with all AI insights
    await step.run("update-meeting", async () => {
      const supabase = await createClient()

      await supabase
        .from("meetings")
        .update({
          ai_summary: aiSummary,
          sentiment_analysis: sentimentAnalysis,
          action_items: actionItems,
          suggested_stage: suggestedStage,
        })
        .eq("id", meeting_id)
    })

    // Create follow-up tasks/interactions
    await step.run("create-follow-ups", async () => {
      const supabase = await createClient()

      // Record the meeting as an interaction
      await supabase.from("interactions").insert({
        workspace_id,
        contact_id: (meeting.contact as { id: string })?.id,
        deal_id: (meeting.deal as { id: string })?.id,
        type: "meeting",
        subject: meeting.title,
        content: aiSummary,
        sentiment: sentimentAnalysis.overall,
        metadata: {
          meeting_id,
          action_items: actionItems.length,
          suggested_stage: suggestedStage,
        },
      })
    })

    // Track usage
    await step.run("track-usage", async () => {
      const supabase = await createClient()

      await supabase.from("usage_records").insert({
        workspace_id,
        type: "meeting_transcription",
        quantity: 1,
        metadata: { meeting_id },
      })

      await supabase.from("usage_records").insert({
        workspace_id,
        type: "ai_generation",
        quantity: 1,
        metadata: { meeting_id, type: "meeting_summary" },
      })
    })

    return {
      success: true,
      meeting_id,
      transcript_length: transcript.length,
      action_items_count: actionItems.length,
      suggested_stage: suggestedStage,
    }
  }
)
