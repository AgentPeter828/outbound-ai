import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'outbound-ai',
  schemas: new Map(),
})

// Event types for type safety
export interface InngestEvents {
  // Enrichment events
  'enrichment/company.enrich': {
    data: {
      workspaceId: string
      companyId: string
      domain: string
    }
  }
  'enrichment/contact.enrich': {
    data: {
      workspaceId: string
      contactId: string
      email: string
    }
  }
  'enrichment/batch.enrich': {
    data: {
      workspaceId: string
      companyIds?: string[]
      contactIds?: string[]
    }
  }

  // Sequence events
  'sequence/contact.enroll': {
    data: {
      workspaceId: string
      sequenceId: string
      contactId: string
      abVariant?: 'A' | 'B'
    }
  }
  'sequence/step.send': {
    data: {
      workspaceId: string
      enrollmentId: string
    }
  }
  'sequence/reply.process': {
    data: {
      workspaceId: string
      emailId: string
      replyContent: string
      originalSubject: string
    }
  }
  'sequence/bounces.check': {
    data: {
      workspaceId: string
    }
  }

  // Meeting events
  'meeting/prep.generate': {
    data: {
      workspaceId: string
      meetingId: string
      contactId: string
      dealId?: string
    }
  }
  'meeting/post.process': {
    data: {
      workspaceId: string
      meetingId: string
      recordingUrl: string
    }
  }

  // Analytics events
  'analytics/daily.rollup': {
    data: {
      workspaceId: string
      date: string
    }
  }
  'analytics/deal.score': {
    data: {
      workspaceId: string
      dealId: string
    }
  }

  // AI events
  'ai/email.generate': {
    data: {
      workspaceId: string
      enrollmentId: string
      stepNumber: number
    }
  }
  'ai/reply.classify': {
    data: {
      workspaceId: string
      emailId: string
      content: string
      originalSubject: string
    }
  }
  'ai/lead.score': {
    data: {
      workspaceId: string
      companyId: string
    }
  }
  'ai/spam.check': {
    data: {
      workspaceId: string
      subject: string
      body: string
      senderEmail: string
    }
  }
}
