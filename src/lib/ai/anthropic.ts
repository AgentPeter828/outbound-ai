import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface EmailGenerationParams {
  template: string
  contact: {
    firstName: string
    lastName: string
    title: string
    company: string
    seniorityLevel?: string
    location?: string
  }
  company: {
    name: string
    industry: string
    description: string
    techStack: string[]
    fundingStage: string
    employeeCount?: number
  }
  sequence: {
    stepNumber: number
    totalSteps?: number
    productDescription: string
    valueProposition: string
    previousEmails?: string[]
    daysSinceLast?: number
  }
  researchHooks?: {
    recentNews?: string
    linkedinRecentPost?: string
    recentJobPostings?: string
    techStackChanges?: string
    recentContent?: string
  }
  senderName: string
  senderCompany: string
  senderTitle?: string
  senderVoice?: string
  industryPainPoint?: string
}

export async function generateEmail(params: EmailGenerationParams): Promise<{
  subject: string
  body: string
  creditsUsed: number
}> {
  const systemPrompt = `You are "${params.senderName}" from the ${params.senderCompany} sales team — a polished, professional account executive who writes cold emails that feel personal and considered, not mass-produced. You're direct, curious, and respect the recipient's time.

## YOUR CORE PHILOSOPHY
- **"Why You, Why Now?"**: Every email implicitly answers why you're emailing THIS person at THIS moment. If you can't answer that, don't send it.
- **Give Before You Get**: Offer an insight or sharp observation before asking for anything.
- **Professional but Human**: Use contractions naturally (you're, it's, we're). Write with natural flow and rhythm. Sound like a thoughtful professional, not a marketing machine.

## YOUR WRITING RULES
1. NEVER start with "I hope this email finds you well," "My name is," or any self-introduction
2. NEVER mention product features in email 1 — lead with observation only
3. NEVER use more than one exclamation point per email
4. NEVER exceed 100 words in the body
5. NEVER use: "synergy," "streamline," "leverage," "solution," "platform," "robust," "best-in-class," "paradigm," "circle back," "touch base," "low-hanging fruit"
6. NEVER start with "I" or "My"
7. ALWAYS reference one specific, recent fact about their company in the opening line when research hooks are provided
8. ALWAYS include exactly one low-friction CTA (a curious question, not a demand)
9. ALWAYS end with a friendly opt-out line (e.g., "If this isn't relevant, no worries — happy to stop reaching out.")
10. NO links in emails for steps 1-3 of a sequence

## TONE ADAPTATION BY SENIORITY
- **C-Level**: Ultra-concise, strategic framing, respect their time. Focus on business outcomes.
- **VP/Director**: Consultative, connect pain to solution. Show you understand their world.
- **Manager/IC**: Collaborative, tactical, day-to-day pain points. Peer-level professionalism.

## YOUR THOUGHT PROCESS (execute silently before writing)
1. **Who is this person?** Role, seniority, likely daily challenges
2. **What's the hook?** Find the most compelling research signal provided (LinkedIn post > company news > hiring > tech stack change)
3. **Connect hook → pain → value**: Link their situation to the problem you solve
4. **Draft using the structure**: Hook line → Problem implication → Social proof (if relevant) → Soft CTA → Opt-out
5. **Self-check**: Does this sound like a real professional wrote it? Is it under 100 words? Would I reply to this? Remove anything that smells like a template or spam.

## CTA HIERARCHY (use in order of preference)
1. "Worth a quick conversation?" / "Sound interesting?"
2. "Mind if I send over a case study on how {similar_company} solved this?"
3. "Open to a 15-min call next week?"
4. NEVER: calendar links in cold emails, "Reply YES," "Click here," multiple CTAs

## SPAM SELF-CHECK (before outputting)
- No ALL CAPS words
- No more than one question mark per sentence
- No urgency language ("limited time," "act now," "don't miss")
- No price mentions or discount offers
- No "free" or "guarantee"
- Sender signs as "${params.senderName}, ${params.senderCompany}"

## OUTPUT FORMAT
Return ONLY the email in this format — no commentary:
SUBJECT: [3-6 words, lowercase unless proper noun, curiosity-driven, under 50 characters]
BODY:
[email body — under 100 words, 1-2 sentence paragraphs, ends with opt-out]`

  const totalSteps = params.sequence.totalSteps || 5
  const researchHooksSection = params.researchHooks ? `
## RESEARCH HOOKS (use the strongest one in your opening line)
- Recent News: ${params.researchHooks.recentNews || 'Not available'}
- LinkedIn Activity: ${params.researchHooks.linkedinRecentPost || 'Not available'}
- Job Openings: ${params.researchHooks.recentJobPostings || 'Not available'}
- Tech Stack Changes: ${params.researchHooks.techStackChanges || 'Not available'}
- Blog/Podcast/Interview: ${params.researchHooks.recentContent || 'Not available'}` : ''

  const userPrompt = `Write a personalized cold email for Step ${params.sequence.stepNumber} of a ${totalSteps}-step sequence.

## RECIPIENT
- Name: ${params.contact.firstName} ${params.contact.lastName}
- Title: ${params.contact.title}
- Company: ${params.contact.company}
- Seniority: ${params.contact.seniorityLevel || 'Unknown'}
- Location: ${params.contact.location || 'Unknown'}

## COMPANY CONTEXT
- Industry: ${params.company.industry}
- Description: ${params.company.description}
- Employee Count: ${params.company.employeeCount || 'Unknown'}
- Tech Stack: ${params.company.techStack.join(', ') || 'Unknown'}
- Funding Stage: ${params.company.fundingStage || 'Unknown'}
${researchHooksSection}

## SENDER
- Name: ${params.senderName}
- Company: ${params.senderCompany}

## PRODUCT & VALUE
- Product: ${params.sequence.productDescription}
- Value Proposition: ${params.sequence.valueProposition}
${params.industryPainPoint ? `- Industry Pain Point: ${params.industryPainPoint}` : ''}

## SEQUENCE CONTEXT
- Step Strategy:
  - Step 1: Pattern interrupt + observation only (no pitch)
  - Step 2: Different angle, problem agitation
  - Step 3: Social proof with specific case study
  - Step 4: Educational value-add, soft ask
  - Step 5: Breakup — permission to close the loop ("Seems like the timing isn't right. Totally understand — I'll close the loop on my end. If things change, I'm easy to find.")
- Current Step: ${params.sequence.stepNumber}
${params.sequence.daysSinceLast ? `- Days Since Last Email: ${params.sequence.daysSinceLast}` : ''}

## TEMPLATE GUIDANCE
${params.template}

${params.sequence.previousEmails?.length ? `## PREVIOUS EMAILS IN SEQUENCE\n${params.sequence.previousEmails.join('\n---\n')}` : ''}

## CONSTRAINTS
- Subject: 3-6 words, lowercase, curiosity-driven, under 50 characters
- Body: Under 100 words
- Must open with strongest research hook if available
- Must adapt tone to recipient's seniority
- Must include one soft CTA
- Must end with friendly opt-out
- No banned words (synergy, streamline, leverage, solution, platform, robust, free, guarantee)
- No links in emails for steps 1-3

## OUTPUT FORMAT
SUBJECT: [subject line]
BODY:
[email body]`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const text = content.text
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/i)
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i)

  const subject = subjectMatch?.[1]?.trim() || 'Quick question'
  const body = bodyMatch?.[1]?.trim() || text

  // Calculate credits based on input/output tokens
  const creditsUsed = Math.ceil((response.usage.input_tokens + response.usage.output_tokens) / 100)

  return { subject, body, creditsUsed }
}

export async function generateMeetingPrep(params: {
  contact: {
    firstName: string
    lastName: string
    title: string
    company: string
  }
  company: {
    name: string
    industry: string
    description: string
    techStack: string[]
  }
  deal: {
    stage: string
    value: number
    notes: string
  }
  previousInteractions: Array<{
    type: string
    content: string
    date: string
  }>
  productInfo: string
}): Promise<{
  summary: string
  talkingPoints: string[]
  potentialObjections: string[]
  suggestedQuestions: string[]
  creditsUsed: number
}> {
  const prompt = `Generate meeting prep notes for an upcoming sales meeting.

CONTACT:
- Name: ${params.contact.firstName} ${params.contact.lastName}
- Title: ${params.contact.title}
- Company: ${params.contact.company}

COMPANY:
- Industry: ${params.company.industry}
- Description: ${params.company.description}
- Tech Stack: ${params.company.techStack.join(', ')}

DEAL STATUS:
- Stage: ${params.deal.stage}
- Value: $${params.deal.value}
- Notes: ${params.deal.notes}

PREVIOUS INTERACTIONS:
${params.previousInteractions.map(i => `- ${i.date}: [${i.type}] ${i.content}`).join('\n')}

OUR PRODUCT:
${params.productInfo}

Provide meeting prep in this format:
SUMMARY: [2-3 sentence overview of the account]
TALKING_POINTS:
- [point 1]
- [point 2]
- [point 3]
POTENTIAL_OBJECTIONS:
- [objection 1]
- [objection 2]
SUGGESTED_QUESTIONS:
- [question 1]
- [question 2]
- [question 3]`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const text = content.text
  const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?=TALKING_POINTS:|$)/is)
  const talkingPointsMatch = text.match(/TALKING_POINTS:\s*([\s\S]+?)(?=POTENTIAL_OBJECTIONS:|$)/i)
  const objectionsMatch = text.match(/POTENTIAL_OBJECTIONS:\s*([\s\S]+?)(?=SUGGESTED_QUESTIONS:|$)/i)
  const questionsMatch = text.match(/SUGGESTED_QUESTIONS:\s*([\s\S]+?)$/i)

  const parseList = (text: string | undefined): string[] => {
    if (!text) return []
    return text
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean)
  }

  const creditsUsed = Math.ceil((response.usage.input_tokens + response.usage.output_tokens) / 100)

  return {
    summary: summaryMatch?.[1]?.trim() || '',
    talkingPoints: parseList(talkingPointsMatch?.[1]),
    potentialObjections: parseList(objectionsMatch?.[1]),
    suggestedQuestions: parseList(questionsMatch?.[1]),
    creditsUsed,
  }
}

export async function generateMeetingSummary(params: {
  transcript: string
  attendees: string[]
  meetingTitle: string
}): Promise<{
  summary: string
  actionItems: Array<{ item: string; owner: string }>
  sentiment: 'positive' | 'neutral' | 'negative'
  suggestedStage: string
  keyTopics: string[]
  creditsUsed: number
}> {
  const prompt = `Analyze this sales meeting transcript and provide a summary.

MEETING: ${params.meetingTitle}
ATTENDEES: ${params.attendees.join(', ')}

TRANSCRIPT:
${params.transcript}

Provide analysis in this format:
SUMMARY: [3-4 sentence meeting summary]
SENTIMENT: [positive/neutral/negative]
SUGGESTED_STAGE: [prospect/contacted/meeting_booked/proposal/negotiation/closed_won/closed_lost]
KEY_TOPICS:
- [topic 1]
- [topic 2]
ACTION_ITEMS:
- [action item] | [owner name]
- [action item] | [owner name]`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const text = content.text
  const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?=SENTIMENT:|$)/is)
  const sentimentMatch = text.match(/SENTIMENT:\s*(\w+)/i)
  const stageMatch = text.match(/SUGGESTED_STAGE:\s*(\w+)/i)
  const topicsMatch = text.match(/KEY_TOPICS:\s*([\s\S]+?)(?=ACTION_ITEMS:|$)/i)
  const actionsMatch = text.match(/ACTION_ITEMS:\s*([\s\S]+?)$/i)

  const parseList = (text: string | undefined): string[] => {
    if (!text) return []
    return text
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean)
  }

  const parseActions = (text: string | undefined): Array<{ item: string; owner: string }> => {
    if (!text) return []
    return text
      .split('\n')
      .map(line => {
        const cleaned = line.replace(/^-\s*/, '').trim()
        const [item, owner] = cleaned.split('|').map(s => s.trim())
        return { item: item || '', owner: owner || 'Unassigned' }
      })
      .filter(a => a.item)
  }

  const creditsUsed = Math.ceil((response.usage.input_tokens + response.usage.output_tokens) / 100)

  return {
    summary: summaryMatch?.[1]?.trim() || '',
    sentiment: (sentimentMatch?.[1]?.toLowerCase() as 'positive' | 'neutral' | 'negative') || 'neutral',
    suggestedStage: stageMatch?.[1]?.toLowerCase() || 'meeting_booked',
    keyTopics: parseList(topicsMatch?.[1]),
    actionItems: parseActions(actionsMatch?.[1]),
    creditsUsed,
  }
}

export async function generateSequence(params: {
  productDescription: string
  targetAudience: string
  valueProposition: string
  numberOfSteps: number
  tone: 'professional' | 'casual' | 'friendly'
  // Support alternate param names from API route
  name?: string
  goal?: string
  icp?: string
  numSteps?: number
}): Promise<{
  steps: Array<{
    stepNumber: number
    delayDays: number
    subjectTemplate: string
    bodyTemplate: string
  }>
  creditsUsed: number
}> {
  const numSteps = params.numberOfSteps || params.numSteps || 5
  const product = params.productDescription || params.goal || ''
  const audience = params.targetAudience || params.icp || ''
  const valueProp = params.valueProposition || params.name || ''

  const prompt = `Create a ${numSteps}-step cold email sequence for B2B sales outreach.

PRODUCT: ${product}
TARGET AUDIENCE: ${audience}
VALUE PROPOSITION: ${valueProp}
TONE: Professional but human — polished, direct, and respectful. Use contractions naturally.

## SEQUENCE PHILOSOPHY
Each step must serve a DIFFERENT strategic purpose. Never repeat the same angle or structure.

## STEP STRATEGY (follow this framework):
- Step 1 (Day 0): Pattern interrupt — lead with an observation about their company/industry. No pitch. Just show you did your homework.
- Step 2 (Day 4): Problem agitation — a different angle. Highlight a pain point, share a brief stat or trend.
- Step 3 (Day 8): Social proof — reference how a similar company solved the same problem. Keep it specific and brief.
- Step 4 (Day 15): Value-add — share an insight, resource, or perspective. Soft ask.
- Step 5 (Day 22): Breakup — permission to close the loop. Humble, no guilt. ("Seems like the timing isn't right — totally understand.")

## RULES FOR EVERY STEP:
- Subject lines: 3-6 words, lowercase (unless proper noun), curiosity-driven, under 50 characters
- Body: Under 100 words, 1-2 sentence paragraphs
- One soft CTA per email (question, not demand)
- End every email with a friendly opt-out line
- NEVER start with "I" or "My name is"
- NEVER use: "synergy," "streamline," "leverage," "solution," "platform," "robust," "free," "guarantee"
- Use {{firstName}}, {{company}}, {{industry}} for personalization placeholders

Format each step as:
STEP [number]:
DELAY: [days]
SUBJECT: [subject template]
BODY:
[body template]
---`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const text = content.text
  const stepRegex = /STEP\s*(\d+):\s*DELAY:\s*(\d+)\s*SUBJECT:\s*(.+?)\s*BODY:\s*([\s\S]+?)(?=---|STEP|$)/gi
  const steps: Array<{
    stepNumber: number
    delayDays: number
    subjectTemplate: string
    bodyTemplate: string
  }> = []

  let match
  while ((match = stepRegex.exec(text)) !== null) {
    steps.push({
      stepNumber: parseInt(match[1]),
      delayDays: parseInt(match[2]),
      subjectTemplate: match[3].trim(),
      bodyTemplate: match[4].trim(),
    })
  }

  const creditsUsed = Math.ceil((response.usage.input_tokens + response.usage.output_tokens) / 100)

  return { steps, creditsUsed }
}

/**
 * Generate a contextual reply to a prospect's response.
 * Replaces canned reply templates with AI-generated, context-aware responses.
 */
export async function generateContextualReply(params: {
  prospectReply: string
  classification: string
  originalEmail: {
    subject: string
    body: string
  }
  contact: {
    firstName: string
    lastName: string
    title: string
    company: string
  }
  senderName: string
  senderCompany: string
  productDescription: string
}): Promise<{
  reply: string
  creditsUsed: number
}> {
  const systemPrompt = `You are "${params.senderName}" from the ${params.senderCompany} sales team — replying to a prospect's response. Your tone is professional, warm, and human. You sound like a real person continuing a conversation, not a template.

## RULES
- Reference specific things the prospect said in their reply
- Match their energy level — if they're brief, be brief; if detailed, be thoughtful
- Under 100 words
- Use contractions naturally
- One clear next step, phrased as a question
- Never be pushy or guilt-trippy
- If they said no, be gracious
- If they asked to unsubscribe, comply immediately and warmly
- Sign off as "${params.senderName}, ${params.senderCompany}"

## CLASSIFICATION-SPECIFIC GUIDANCE
- interested: Acknowledge their interest specifically, propose a concrete next step (suggest times, not calendar links)
- meeting_request: Confirm enthusiasm, suggest 2-3 specific time slots
- objection: Acknowledge the concern genuinely, address it briefly with evidence, ask if that changes things
- question: Answer directly and concisely, then offer to go deeper on a call
- wrong_person: Thank them, ask if they could point you to the right person
- not_interested: Be gracious, leave the door open without pressure
- unsubscribe: Comply immediately, apologize for the inconvenience, confirm removal`

  const userPrompt = `Generate a reply to this prospect's response.

## CONTEXT
- Prospect: ${params.contact.firstName} ${params.contact.lastName}, ${params.contact.title} at ${params.contact.company}
- Classification: ${params.classification}
- Our product: ${params.productDescription}

## ORIGINAL EMAIL WE SENT
Subject: ${params.originalEmail.subject}
Body: ${params.originalEmail.body}

## PROSPECT'S REPLY
${params.prospectReply}

## OUTPUT
Write ONLY the reply body — no subject line, no commentary.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const creditsUsed = Math.ceil((response.usage.input_tokens + response.usage.output_tokens) / 100)

  return {
    reply: content.text.trim(),
    creditsUsed,
  }
}
