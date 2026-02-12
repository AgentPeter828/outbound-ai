import { inngest } from "../client"
import { createClient } from "@/lib/supabase/server"
import { enrichCompany, enrichContact } from "@/lib/apollo"
import { redis, CACHE_TTL } from "@/lib/redis"

/**
 * Enrich a company with Apollo.io data
 */
export const companyEnrich = inngest.createFunction(
  {
    id: "company-enrich",
    name: "Enrich Company",
    throttle: {
      limit: 100,
      period: "1m",
    },
    retries: 3,
  },
  { event: "enrichment/company.enrich" },
  async ({ event, step }) => {
    const { company_id, domain, workspace_id } = event.data

    // Check cache first
    const cacheKey = `company:${domain}`
    const cached = await step.run("check-cache", async () => {
      return await redis.get(cacheKey)
    })

    if (cached) {
      return { source: "cache", data: cached }
    }

    // Fetch from Apollo
    const enrichmentData = await step.run("fetch-apollo", async () => {
      return await apolloClient.enrichCompany(domain)
    })

    if (!enrichmentData) {
      return { success: false, error: "No data found" }
    }

    // Update database
    await step.run("update-database", async () => {
      const supabase = await createClient()

      await supabase
        .from("companies")
        .update({
          industry: enrichmentData.industry,
          employee_count: enrichmentData.employee_count,
          annual_revenue: enrichmentData.annual_revenue,
          technologies: enrichmentData.technologies,
          funding_stage: enrichmentData.funding_stage,
          metadata: {
            ...enrichmentData,
            enriched_at: new Date().toISOString(),
          },
        })
        .eq("id", company_id)
    })

    // Cache the result
    await step.run("cache-result", async () => {
      await redis.set(cacheKey, enrichmentData, {
        ex: CACHE_TTL.COMPANY_DATA,
      })
    })

    // Track usage
    await step.run("track-usage", async () => {
      const supabase = await createClient()

      await supabase.from("usage_records").insert({
        workspace_id,
        type: "enrichment",
        quantity: 1,
        metadata: { company_id, domain },
      })
    })

    return { success: true, data: enrichmentData }
  }
)

/**
 * Enrich a contact with Apollo.io data
 */
export const contactEnrich = inngest.createFunction(
  {
    id: "contact-enrich",
    name: "Enrich Contact",
    throttle: {
      limit: 100,
      period: "1m",
    },
    retries: 3,
  },
  { event: "enrichment/contact.enrich" },
  async ({ event, step }) => {
    const { contact_id, email, workspace_id } = event.data

    // Check cache first
    const cacheKey = `contact:${email}`
    const cached = await step.run("check-cache", async () => {
      return await redis.get(cacheKey)
    })

    if (cached) {
      return { source: "cache", data: cached }
    }

    // Fetch from Apollo
    const enrichmentData = await step.run("fetch-apollo", async () => {
      return await apolloClient.enrichPerson(email)
    })

    if (!enrichmentData) {
      return { success: false, error: "No data found" }
    }

    // Update database
    await step.run("update-database", async () => {
      const supabase = await createClient()

      await supabase
        .from("contacts")
        .update({
          title: enrichmentData.title || undefined,
          linkedin_url: enrichmentData.linkedin_url,
          phone: enrichmentData.phone,
          seniority: enrichmentData.seniority,
          department: enrichmentData.department,
          metadata: {
            ...enrichmentData,
            enriched_at: new Date().toISOString(),
          },
        })
        .eq("id", contact_id)
    })

    // Cache the result
    await step.run("cache-result", async () => {
      await redis.set(cacheKey, enrichmentData, {
        ex: CACHE_TTL.CONTACT_DATA,
      })
    })

    // Track usage
    await step.run("track-usage", async () => {
      const supabase = await createClient()

      await supabase.from("usage_records").insert({
        workspace_id,
        type: "enrichment",
        quantity: 1,
        metadata: { contact_id, email },
      })
    })

    return { success: true, data: enrichmentData }
  }
)

/**
 * Batch enrich multiple contacts
 */
export const batchEnrich = inngest.createFunction(
  {
    id: "batch-enrich",
    name: "Batch Enrich Contacts",
    concurrency: {
      limit: 5,
    },
  },
  { event: "enrichment/batch.enrich" },
  async ({ event, step }) => {
    const { contact_ids, workspace_id } = event.data

    // Get contact emails
    const contacts = await step.run("get-contacts", async () => {
      const supabase = await createClient()

      const { data } = await supabase
        .from("contacts")
        .select("id, email")
        .in("id", contact_ids)

      return data || []
    })

    // Fan out to individual enrichment
    const results = await step.run("enrich-all", async () => {
      const enrichPromises = contacts.map(async (contact) => {
        await inngest.send({
          name: "enrichment/contact.enrich",
          data: {
            contact_id: contact.id,
            email: contact.email,
            workspace_id,
          },
        })
        return contact.id
      })

      return await Promise.all(enrichPromises)
    })

    return {
      success: true,
      total: contact_ids.length,
      queued: results.length,
    }
  }
)
