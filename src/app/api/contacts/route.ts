import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const company_id = searchParams.get("company_id")
    const status = searchParams.get("status")

    let query = supabase
      .from("contacts")
      .select(`
        *,
        company:companies (id, name, domain)
      `, { count: "exact" })
      .eq("workspace_id", membership.workspace_id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (company_id) {
      query = query.eq("company_id", company_id)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data: contacts, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const {
      email,
      first_name,
      last_name,
      title,
      phone,
      linkedin_url,
      company_id,
      enrich = true,
    } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", membership.workspace_id)
      .eq("email", email)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Contact with this email already exists" }, { status: 409 })
    }

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        workspace_id: membership.workspace_id,
        email,
        first_name,
        last_name,
        title,
        phone,
        linkedin_url,
        company_id,
        status: "active",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger enrichment if requested
    if (enrich) {
      await inngest.send({
        name: "enrichment/contact.enrich",
        data: {
          contact_id: contact.id,
          email: contact.email,
          workspace_id: membership.workspace_id,
        },
      })
    }

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error("Error creating contact:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
