import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateEmail, generateSequence } from "@/lib/ai/anthropic"

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
    const { type, ...params } = body

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 })
    }

    // Track usage
    await supabase.from("usage_records").insert({
      workspace_id: membership.workspace_id,
      type: "ai_generation",
      quantity: 1,
      metadata: { generation_type: type },
    })

    switch (type) {
      case "email": {
        const { contact, company, template, previousEmails } = params

        if (!contact) {
          return NextResponse.json({ error: "Contact is required" }, { status: 400 })
        }

        const result = await generateEmail({
          contact,
          company: company || { name: '', industry: '', description: '', techStack: [], fundingStage: '' },
          template: template || '',
          sequence: params.sequence || { stepNumber: 1, productDescription: '', valueProposition: '' },
          senderName: 'Sales Team',
          senderCompany: 'OutboundAI',
          researchHooks: params.researchHooks,
        })

        return NextResponse.json({ result })
      }

      case "sequence": {
        const { name, goal, icp, numSteps = 4, tone = "professional" } = params

        if (!goal) {
          return NextResponse.json({ error: "Goal is required" }, { status: 400 })
        }

        const result = await generateSequence({
          productDescription: goal,
          targetAudience: icp || '',
          valueProposition: name || '',
          numberOfSteps: numSteps,
          tone,
        })

        return NextResponse.json({ result })
      }

      case "subject_line": {
        // Generate multiple subject line variations
        const { context, count = 5 } = params

        // In production, this would call Claude
        const subjectLines = [
          `Quick question about ${context.company || "your company"}`,
          `${context.firstName}, saw your recent ${context.trigger || "news"}`,
          `Helping ${context.industry || "companies"} like yours grow faster`,
          `Ideas for ${context.company || "improving"} ${context.goal || "sales"}`,
          `${context.firstName} - ${context.value_prop || "quick thought"}`,
        ].slice(0, count)

        return NextResponse.json({ result: subjectLines })
      }

      case "personalization": {
        // Generate personalization snippets
        const { contact: contactData, company: companyData, type: personalizationType } = params

        // In production, this would call Claude with research
        const personalizations = {
          opening: `I noticed ${companyData?.name || "your company"} recently ${
            companyData?.recent_news || "made some exciting moves"
          }.`,
          value_prop: `Companies like ${companyData?.name || "yours"} in the ${
            companyData?.industry || "industry"
          } typically see 40% improvement in sales efficiency.`,
          call_to_action: `Would you be open to a 15-minute call ${
            contactData?.firstName ? `, ${contactData.firstName}` : ""
          }?`,
        }

        return NextResponse.json({
          result: personalizationType ? personalizations[personalizationType as keyof typeof personalizations] : personalizations,
        })
      }

      default:
        return NextResponse.json({ error: "Invalid generation type" }, { status: 400 })
    }
  } catch (error) {
    console.error("AI generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
