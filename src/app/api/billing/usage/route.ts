import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id, workspaces (*)")
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 })
    }

    const workspace = membership.workspaces as {
      id: string
      credits_used: number
      credits_included: number
      current_period_start: string
      current_period_end: string
    }

    // Get usage breakdown for current period
    const periodStart = workspace.current_period_start || new Date(new Date().setDate(1)).toISOString()

    const { data: usageRecords } = await supabase
      .from("usage_records")
      .select("type, quantity")
      .eq("workspace_id", workspace.id)
      .gte("created_at", periodStart)

    // Aggregate by type
    const usageByType = (usageRecords || []).reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + record.quantity
      return acc
    }, {} as Record<string, number>)

    const totalUsage = Object.values(usageByType).reduce((sum, val) => sum + val, 0)

    return NextResponse.json({
      usage: {
        total: totalUsage,
        included: workspace.credits_included || 1000,
        remaining: Math.max(0, (workspace.credits_included || 1000) - totalUsage),
        breakdown: usageByType,
      },
      period: {
        start: periodStart,
        end: workspace.current_period_end,
      },
    })
  } catch (error) {
    console.error("Usage error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
