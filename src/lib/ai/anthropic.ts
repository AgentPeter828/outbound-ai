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
  }
  company: {
    name: string
    industry: string
    description: string
    techStack: string[]
    fundingStage: string
  }
  sequence: {
    stepNumber: number
    productDescription: string
    valueProposition: string
    previousEmails?: string[]
  }
  senderName: string
  senderCompany: string
}

export async function generateEmail(params: EmailGenerationParams): Promise<{
  subject: string
  body: string
  creditsUsed: number
}> {
  const systemPrompt = `You are an expert B2B sales email writer. Write highly personalized, professional cold emails that:
- Are concise (under 150 words for body)
- Reference specific details about the prospect's company
- Have a clear, single call-to-action
- Avoid spam trigger words
- Sound human, not templated
- Match the tone appropriate for the recipient's seniority level`

  const userPrompt = `Write a personalized sales email for step ${params.sequence.stepNumber} of a sequence.

RECIPIENT:
- Name: ${params.contact.firstName} ${params.contact.lastName}
- Title: ${params.contact.title}
- Company: ${params.contact.company}

COMPANY CONTEXT:
- Industry: ${params.company.industry}
- Description: ${params.company.description}
- Tech Stack: ${params.company.techStack.join(', ')}
- Funding Stage: ${params.company.fundingStage}

SENDER:
- Name: ${params.senderName}
- Company: ${params.senderCompany}

PRODUCT:
${params.sequence.productDescription}

VALUE PROPOSITION:
${params.sequence.valueProposition}

TEMPLATE GUIDANCE:
${params.template}

${params.sequence.previousEmails?.length ? `PREVIOUS EMAILS IN SEQUENCE:\n${params.sequence.previousEmails.join('\n---\n')}` : ''}

Return your response in this exact format:
SUBJECT: [email subject line]
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
}): Promise<{
  steps: Array<{
    stepNumber: number
    delayDays: number
    subjectTemplate: string
    bodyTemplate: string
  }>
  creditsUsed: number
}> {
  const prompt = `Create a ${params.numberOfSteps}-step cold email sequence for B2B sales.

PRODUCT: ${params.productDescription}
TARGET AUDIENCE: ${params.targetAudience}
VALUE PROPOSITION: ${params.valueProposition}
TONE: ${params.tone}

For each step, include:
1. Days delay from previous step (step 1 = 0 days)
2. Subject line template (use {{firstName}}, {{company}} for personalization)
3. Body template (use {{firstName}}, {{company}}, {{industry}} for personalization)

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
