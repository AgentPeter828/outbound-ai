import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import {
  // Enrichment
  companyEnrich,
  contactEnrich,
  batchEnrich,
  // Sequence
  enrollContact,
  sendStep,
  processReply,
  checkBounces,
  // Meeting
  preMeetingPrep,
  postMeetingProcess,
  // Analytics
  dailyRollup,
  dealScoring,
  // AI
  generateEmail,
  classifyReply,
  scoreLead,
  spamCheck,
  // Scheduled
  scheduledDailyRollup,
  scheduledBounceCheck,
  scheduledMeetingPrep,
  scheduledDealScoring,
  scheduledSequenceSend,
} from "@/lib/inngest/functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Enrichment functions
    companyEnrich,
    contactEnrich,
    batchEnrich,
    // Sequence functions
    enrollContact,
    sendStep,
    processReply,
    checkBounces,
    // Meeting functions
    preMeetingPrep,
    postMeetingProcess,
    // Analytics functions
    dailyRollup,
    dealScoring,
    // AI functions
    generateEmail,
    classifyReply,
    scoreLead,
    spamCheck,
    // Scheduled functions
    scheduledDailyRollup,
    scheduledBounceCheck,
    scheduledMeetingPrep,
    scheduledDealScoring,
    scheduledSequenceSend,
  ],
})
