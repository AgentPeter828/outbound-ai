// Kimi K2 via OpenRouter for classification tasks (cheapest option)

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
  }
}

async function callOpenRouter(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens: number = 500
): Promise<OpenRouterResponse> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://outboundai.com',
      'X-Title': 'OutboundAI',
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2',
      messages,
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`)
  }

  return response.json()
}

export type ReplyClassification =
  | 'interested'
  | 'not_interested'
  | 'objection'
  | 'out_of_office'
  | 'wrong_person'
  | 'unsubscribe'
  | 'bounce'
  | 'other'

export async function classifyReply(params: {
  emailBody: string
  originalSubject: string
  context?: string
}): Promise<{
  classification: ReplyClassification
  confidence: number
  summary: string
  suggestedAction: string
  creditsUsed: number
}> {
  const systemPrompt = `You are an email classification assistant for sales teams. Classify email replies into one of these categories:
- interested: The prospect shows interest in learning more, asks questions, or wants to proceed
- not_interested: Polite or firm decline, not the right time, no budget
- objection: Raises specific concerns about price, features, competition, timing
- out_of_office: Auto-reply indicating absence
- wrong_person: Says they're not the right contact or doesn't handle this
- unsubscribe: Asks to be removed from the list or stop emails
- bounce: Email delivery failure
- other: Doesn't fit any category

Respond ONLY in this exact JSON format:
{"classification": "category", "confidence": 0.95, "summary": "Brief summary", "suggestedAction": "What to do next"}`

  const userPrompt = `Classify this email reply:

Original subject: ${params.originalSubject}
${params.context ? `Context: ${params.context}` : ''}

Reply:
${params.emailBody}`

  const response = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const content = response.choices[0].message.content

  try {
    const parsed = JSON.parse(content)
    return {
      classification: parsed.classification as ReplyClassification,
      confidence: parsed.confidence,
      summary: parsed.summary,
      suggestedAction: parsed.suggestedAction,
      creditsUsed: Math.ceil((response.usage.prompt_tokens + response.usage.completion_tokens) / 1000),
    }
  } catch {
    // Fallback parsing
    return {
      classification: 'other',
      confidence: 0.5,
      summary: content.slice(0, 200),
      suggestedAction: 'Review manually',
      creditsUsed: 1,
    }
  }
}

export async function scoreLeadFit(params: {
  company: {
    industry: string
    employeeCount: number
    fundingStage: string
    techStack: string[]
    location: string
  }
  icpCriteria: {
    targetIndustries: string[]
    minEmployees: number
    maxEmployees: number
    targetFundingStages: string[]
    targetTechStack: string[]
    targetLocations: string[]
  }
}): Promise<{
  fitScore: number
  reasons: string[]
  creditsUsed: number
}> {
  const systemPrompt = `You are a lead scoring assistant. Score how well a company matches an Ideal Customer Profile (ICP).
Return a score from 0 to 100 and list the key reasons.

Respond ONLY in this exact JSON format:
{"fitScore": 85, "reasons": ["Strong industry match", "Right company size", "Uses relevant tech"]}`

  const userPrompt = `Score this company against the ICP:

COMPANY:
- Industry: ${params.company.industry}
- Employees: ${params.company.employeeCount}
- Funding Stage: ${params.company.fundingStage}
- Tech Stack: ${params.company.techStack.join(', ')}
- Location: ${params.company.location}

ICP CRITERIA:
- Target Industries: ${params.icpCriteria.targetIndustries.join(', ')}
- Employee Range: ${params.icpCriteria.minEmployees} - ${params.icpCriteria.maxEmployees}
- Target Funding: ${params.icpCriteria.targetFundingStages.join(', ')}
- Target Tech: ${params.icpCriteria.targetTechStack.join(', ')}
- Target Locations: ${params.icpCriteria.targetLocations.join(', ')}`

  const response = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const content = response.choices[0].message.content

  try {
    const parsed = JSON.parse(content)
    return {
      fitScore: parsed.fitScore,
      reasons: parsed.reasons,
      creditsUsed: Math.ceil((response.usage.prompt_tokens + response.usage.completion_tokens) / 1000),
    }
  } catch {
    return {
      fitScore: 50,
      reasons: ['Unable to parse scoring response'],
      creditsUsed: 1,
    }
  }
}

export async function detectIntentSignals(params: {
  companyName: string
  recentNews: string[]
  hiringData: string[]
  techChanges: string[]
  fundingNews: string
}): Promise<{
  intentScore: number
  signals: Array<{ type: string; description: string; strength: 'high' | 'medium' | 'low' }>
  creditsUsed: number
}> {
  const systemPrompt = `You are an intent signal detector for sales. Analyze company data to identify buying signals.
Score intent from 0-100 and list specific signals.

Respond ONLY in this exact JSON format:
{"intentScore": 75, "signals": [{"type": "hiring", "description": "Hiring 3 engineers", "strength": "high"}]}`

  const userPrompt = `Detect intent signals for ${params.companyName}:

Recent News: ${params.recentNews.join('; ')}
Hiring: ${params.hiringData.join('; ')}
Tech Changes: ${params.techChanges.join('; ')}
Funding: ${params.fundingNews}`

  const response = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const content = response.choices[0].message.content

  try {
    const parsed = JSON.parse(content)
    return {
      intentScore: parsed.intentScore,
      signals: parsed.signals,
      creditsUsed: Math.ceil((response.usage.prompt_tokens + response.usage.completion_tokens) / 1000),
    }
  } catch {
    return {
      intentScore: 0,
      signals: [],
      creditsUsed: 1,
    }
  }
}
