import { getCachedOrFetch, apolloCompanyKey, apolloContactKey, apolloSearchKey } from './redis'

const APOLLO_API_URL = 'https://api.apollo.io/v1'

interface ApolloHeaders {
  'Content-Type': string
  'x-api-key': string
}

function getHeaders(): ApolloHeaders {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.APOLLO_API_KEY!,
  }
}

export interface ApolloCompany {
  id: string
  name: string
  website_url: string
  domain: string
  industry: string
  estimated_num_employees: number
  funding_stage: string
  total_funding: number
  latest_funding_stage: string
  latest_funding_amount: number
  technology_names: string[]
  city: string
  state: string
  country: string
  linkedin_url: string
  short_description: string
  founded_year: number
  logo_url: string
  phone: string
  seo_description: string
  keywords: string[]
}

export interface ApolloContact {
  id: string
  first_name: string
  last_name: string
  name: string
  email: string
  email_status: string
  title: string
  seniority: string
  departments: string[]
  linkedin_url: string
  phone_numbers: Array<{ raw_number: string; type: string }>
  organization: ApolloCompany
  city: string
  state: string
  country: string
  photo_url: string
  employment_history: Array<{
    organization_name: string
    title: string
    start_date: string
    end_date: string | null
    current: boolean
  }>
}

export interface ApolloSearchFilters {
  person_titles?: string[]
  person_seniorities?: string[]
  organization_industry_tag_ids?: string[]
  organization_num_employees_ranges?: string[]
  organization_latest_funding_stage_cd?: string[]
  organization_locations?: string[]
  q_organization_keyword_tags?: string[]
  q_organization_domains?: string[]
  per_page?: number
  page?: number
}

export interface ApolloSearchResult {
  contacts: ApolloContact[]
  pagination: {
    page: number
    per_page: number
    total_entries: number
    total_pages: number
  }
}

export async function searchPeople(
  filters: ApolloSearchFilters
): Promise<ApolloSearchResult> {
  const cacheKey = apolloSearchKey(filters)

  return getCachedOrFetch(cacheKey, async () => {
    const response = await fetch(`${APOLLO_API_URL}/mixed_people/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...filters,
        per_page: filters.per_page || 25,
        page: filters.page || 1,
      }),
    })

    if (!response.ok) {
      throw new Error(`Apollo search error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      contacts: data.contacts || [],
      pagination: data.pagination || { page: 1, per_page: 25, total_entries: 0, total_pages: 0 },
    }
  })
}

export async function enrichCompany(domain: string): Promise<ApolloCompany | null> {
  const cacheKey = apolloCompanyKey(domain)

  return getCachedOrFetch(cacheKey, async () => {
    const response = await fetch(`${APOLLO_API_URL}/organizations/enrich`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ domain }),
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Apollo company enrich error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.organization || null
  })
}

export async function enrichContact(email: string): Promise<ApolloContact | null> {
  const cacheKey = apolloContactKey(email)

  return getCachedOrFetch(cacheKey, async () => {
    const response = await fetch(`${APOLLO_API_URL}/people/match`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email,
        reveal_personal_emails: false,
      }),
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Apollo contact enrich error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.person || null
  })
}

export async function verifyEmail(email: string): Promise<{
  email: string
  is_valid: boolean
  status: string
}> {
  const response = await fetch(`${APOLLO_API_URL}/email_verifier`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(`Apollo email verify error: ${response.statusText}`)
  }

  return response.json()
}

export async function bulkEnrichPeople(emails: string[]): Promise<ApolloContact[]> {
  const response = await fetch(`${APOLLO_API_URL}/people/bulk_match`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      details: emails.map(email => ({ email })),
    }),
  })

  if (!response.ok) {
    throw new Error(`Apollo bulk enrich error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.matches || []
}

// Industry mapping for Apollo filters
export const APOLLO_INDUSTRIES = [
  { id: 'information-technology-and-services', name: 'IT & Services' },
  { id: 'computer-software', name: 'Computer Software' },
  { id: 'internet', name: 'Internet' },
  { id: 'financial-services', name: 'Financial Services' },
  { id: 'hospital-health-care', name: 'Healthcare' },
  { id: 'marketing-and-advertising', name: 'Marketing & Advertising' },
  { id: 'retail', name: 'Retail' },
  { id: 'real-estate', name: 'Real Estate' },
  { id: 'consumer-services', name: 'Consumer Services' },
  { id: 'telecommunications', name: 'Telecommunications' },
]

export const APOLLO_EMPLOYEE_RANGES = [
  { id: '1,10', name: '1-10' },
  { id: '11,20', name: '11-20' },
  { id: '21,50', name: '21-50' },
  { id: '51,100', name: '51-100' },
  { id: '101,200', name: '101-200' },
  { id: '201,500', name: '201-500' },
  { id: '501,1000', name: '501-1000' },
  { id: '1001,5000', name: '1001-5000' },
  { id: '5001,10000', name: '5001-10000' },
  { id: '10001,', name: '10000+' },
]

export const APOLLO_FUNDING_STAGES = [
  { id: 'seed', name: 'Seed' },
  { id: 'series_a', name: 'Series A' },
  { id: 'series_b', name: 'Series B' },
  { id: 'series_c', name: 'Series C' },
  { id: 'series_d', name: 'Series D+' },
  { id: 'pre_seed', name: 'Pre-Seed' },
  { id: 'private_equity', name: 'Private Equity' },
  { id: 'public', name: 'Public' },
]

export const APOLLO_SENIORITIES = [
  { id: 'c_suite', name: 'C-Suite' },
  { id: 'vp', name: 'VP' },
  { id: 'director', name: 'Director' },
  { id: 'manager', name: 'Manager' },
  { id: 'senior', name: 'Senior' },
  { id: 'entry', name: 'Entry Level' },
]

// Helper to map role_type to Apollo seniority
export function roleTypeToSeniority(roleType: string): string[] {
  switch (roleType) {
    case 'decision_maker':
      return ['c_suite', 'vp']
    case 'champion':
      return ['director', 'manager']
    case 'influencer':
      return ['senior', 'manager']
    case 'end_user':
      return ['senior', 'entry']
    default:
      return []
  }
}

// Helper to detect role_type from title
export function detectRoleType(title: string): 'champion' | 'decision_maker' | 'influencer' | 'end_user' {
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes('ceo') || lowerTitle.includes('cto') || lowerTitle.includes('cfo') ||
      lowerTitle.includes('chief') || lowerTitle.includes('founder') || lowerTitle.includes('owner') ||
      lowerTitle.includes('president') || lowerTitle.includes('vp') || lowerTitle.includes('vice president')) {
    return 'decision_maker'
  }

  if (lowerTitle.includes('director') || lowerTitle.includes('head of')) {
    return 'champion'
  }

  if (lowerTitle.includes('manager') || lowerTitle.includes('lead')) {
    return 'influencer'
  }

  return 'end_user'
}
