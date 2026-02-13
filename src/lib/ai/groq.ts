// Groq (Llama 4 Scout) for fast real-time tasks like spam checking

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface GroqResponse {
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

async function callGroq(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens: number = 200
): Promise<GroqResponse> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`)
  }

  return response.json()
}

export async function checkSpamScore(params: {
  subject: string
  body: string
  senderName: string
  senderEmail: string
}): Promise<{
  spamScore: number
  issues: string[]
  suggestions: string[]
}> {
  const systemPrompt = `You are an email deliverability expert. Analyze emails for spam triggers.
Score from 0 (definitely spam) to 100 (definitely not spam).
Identify issues and provide specific rewrite suggestions for each issue.

Check for:
- Spam trigger words (free, guarantee, act now, limited time, click here, buy now, discount)
- ALL CAPS words
- Excessive punctuation (multiple ! or ?)
- Too many links
- Missing opt-out/unsubscribe language
- Overly salesy tone
- Generic sender names
- Price mentions in cold emails

Respond ONLY in JSON:
{"spamScore": 85, "issues": ["Too many links", "Uses 'free' in subject"], "suggestions": ["Remove 2 links — keep only one if needed", "Replace 'free trial' with 'worth exploring?' or 'happy to show you'"]}`

  const userPrompt = `Check this email for spam issues:

From: ${params.senderName} <${params.senderEmail}>
Subject: ${params.subject}

Body:
${params.body}`

  const response = await callGroq([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const content = response.choices[0].message.content

  try {
    return JSON.parse(content)
  } catch {
    return {
      spamScore: 70,
      issues: ['Unable to analyze'],
      suggestions: ['Review manually'],
    }
  }
}

export async function extractSentiment(text: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative'
  confidence: number
}> {
  const systemPrompt = `Analyze sentiment. Respond ONLY in JSON:
{"sentiment": "positive", "confidence": 0.9}`

  const response = await callGroq([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ], 50)

  const content = response.choices[0].message.content

  try {
    return JSON.parse(content)
  } catch {
    return {
      sentiment: 'neutral',
      confidence: 0.5,
    }
  }
}

export async function generateQuickReply(params: {
  originalEmail: string
  classification: string
  context: string
}): Promise<{
  reply: string
}> {
  const systemPrompt = `You are a helpful sales assistant. Generate a brief, professional reply to this email.
Keep it under 100 words. Be helpful but not pushy.`

  const userPrompt = `Generate a reply to this email.

Classification: ${params.classification}
Context: ${params.context}

Original email:
${params.originalEmail}`

  const response = await callGroq([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 300)

  return {
    reply: response.choices[0].message.content,
  }
}

export async function suggestNextAction(params: {
  dealStage: string
  lastInteraction: string
  daysSinceLastContact: number
  sentiment: string
}): Promise<{
  action: string
  priority: 'high' | 'medium' | 'low'
  reason: string
}> {
  const systemPrompt = `You are a sales coach. Suggest the best next action for a deal.
Respond ONLY in JSON:
{"action": "Send follow-up email", "priority": "high", "reason": "No response in 5 days"}`

  const userPrompt = `What's the best next action for this deal?

Stage: ${params.dealStage}
Last interaction: ${params.lastInteraction}
Days since contact: ${params.daysSinceLastContact}
Sentiment: ${params.sentiment}`

  const response = await callGroq([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 100)

  const content = response.choices[0].message.content

  try {
    return JSON.parse(content)
  } catch {
    return {
      action: 'Follow up',
      priority: 'medium',
      reason: 'Regular check-in',
    }
  }
}
