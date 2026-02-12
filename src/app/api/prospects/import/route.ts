import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 })
    }

    const body = await request.json()
    const { prospects, enrich = true } = body

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: "prospects array is required" }, { status: 400 })
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

    const contactsToEnrich: string[] = []

    for (const prospect of prospects) {
      try {
        // Check for existing contact
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("workspace_id", membership.workspace_id)
          .eq("email", prospect.email)
          .single()

        if (existing) {
          results.skipped++
          continue
        }

        // Create or find company
        let companyId = null
        if (prospect.company) {
          const domain = prospect.company.domain ||
            prospect.email.split("@")[1]

          // Check for existing company
          const { data: existingCompany } = await supabase
            .from("companies")
            .select("id")
            .eq("workspace_id", membership.workspace_id)
            .eq("domain", domain)
            .single()

          if (existingCompany) {
            companyId = existingCompany.id
          } else {
            // Create new company
            const { data: newCompany } = await supabase
              .from("companies")
              .insert({
                workspace_id: membership.workspace_id,
                name: prospect.company.name,
                domain,
                industry: prospect.company.industry,
                employee_count: prospect.company.employee_count,
                annual_revenue: prospect.company.annual_revenue,
              })
              .select()
              .single()

            companyId = newCompany?.id
          }
        }

        // Create contact
        const { data: contact, error } = await supabase
          .from("contacts")
          .insert({
            workspace_id: membership.workspace_id,
            email: prospect.email,
            first_name: prospect.first_name,
            last_name: prospect.last_name,
            title: prospect.title,
            phone: prospect.phone,
            linkedin_url: prospect.linkedin_url,
            company_id: companyId,
            status: "active",
            source: "import",
          })
          .select()
          .single()

        if (error) {
          results.errors.push(`Failed to import ${prospect.email}: ${error.message}`)
          continue
        }

        results.imported++

        if (enrich && contact) {
          contactsToEnrich.push(contact.id)
        }
      } catch (err) {
        results.errors.push(`Error processing ${prospect.email}: ${err}`)
      }
    }

    // Trigger batch enrichment
    if (contactsToEnrich.length > 0) {
      await inngest.send({
        name: "enrichment/batch.enrich",
        data: {
          contact_ids: contactsToEnrich,
          workspace_id: membership.workspace_id,
        },
      })
    }

    // Track usage
    await supabase.from("usage_records").insert({
      workspace_id: membership.workspace_id,
      type: "prospect_import",
      quantity: results.imported,
      metadata: {
        total_attempted: prospects.length,
        skipped: results.skipped,
        errors: results.errors.length,
      },
    })

    return NextResponse.json({
      success: true,
      ...results,
      enrichment_queued: contactsToEnrich.length,
    })
  } catch (error) {
    console.error("Prospect import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
