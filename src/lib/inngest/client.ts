import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "outbound-ai",
  name: "OutboundAI",
})

// Event types for type safety
export type Events = {
  // Enrichment events
  "enrichment/company.enrich": {
    data: {
      company_id: string
      domain: string
      workspace_id: string
    }
  }
  "enrichment/contact.enrich": {
    data: {
      contact_id: string
      email: string
      workspace_id: string
    }
  }
  "enrichment/batch.enrich": {
    data: {
      contact_ids: string[]
      workspace_id: string
    }
  }

  // Sequence events
  "sequence/contact.enrolled": {
    data: {
      enrollment_id: string
      contact_id: string
      sequence_id: string
      workspace_id: string
    }
  }
  "sequence/step.send": {
    data: {
      enrollment_id: string
      step_number: number
      workspace_id: string
    }
  }
  "sequence/reply.received": {
    data: {
      interaction_id: string
      contact_id: string
      workspace_id: string
    }
  }
  "sequence/bounces.check": {
    data: {
      workspace_id: string
    }
  }

  // Meeting events
  "meeting/prep.generate": {
    data: {
      meeting_id: string
      workspace_id: string
    }
  }
  "meeting/recording.process": {
    data: {
      meeting_id: string
      recording_url: string
      workspace_id: string
    }
  }

  // Analytics events
  "analytics/daily.rollup": {
    data: {
      workspace_id: string
      date: string
    }
  }
  "analytics/deal.score": {
    data: {
      deal_id: string
      workspace_id: string
    }
  }

  // AI events
  "ai/email.generate": {
    data: {
      enrollment_id: string
      step_number: number
      workspace_id: string
    }
  }
  "ai/reply.classify": {
    data: {
      interaction_id: string
      content: string
      workspace_id: string
    }
  }
  "ai/lead.score": {
    data: {
      contact_id: string
      workspace_id: string
    }
  }
  "ai/spam.check": {
    data: {
      email_content: string
      subject: string
    }
  }
}
