import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/email?error=${error}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/email?error=missing_params", request.url)
      )
    }

    // Decode state
    let stateData: { workspace_id: string; user_id: string }
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
    } catch {
      return NextResponse.redirect(
        new URL("/settings/email?error=invalid_state", request.url)
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text())
      return NextResponse.redirect(
        new URL("/settings/email?error=token_exchange_failed", request.url)
      )
    }

    const tokens = await tokenResponse.json()

    // Get user email
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    )

    const userInfo = await userInfoResponse.json()

    // Store integration in database
    const supabase = await createClient()

    // Check for existing integration
    const { data: existing } = await supabase
      .from("workspace_integrations")
      .select("id")
      .eq("workspace_id", stateData.workspace_id)
      .eq("provider", "gmail")
      .single()

    if (existing) {
      // Update existing
      await supabase
        .from("workspace_integrations")
        .update({
          status: "active",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
          metadata: {
            email: userInfo.email,
            connected_at: new Date().toISOString(),
          },
        })
        .eq("id", existing.id)
    } else {
      // Create new
      await supabase.from("workspace_integrations").insert({
        workspace_id: stateData.workspace_id,
        provider: "gmail",
        status: "active",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        metadata: {
          email: userInfo.email,
          connected_at: new Date().toISOString(),
        },
      })
    }

    // Set up Gmail watch for push notifications (in production)
    // This would register the webhook with Gmail API

    return NextResponse.redirect(
      new URL("/settings/email?success=connected", request.url)
    )
  } catch (error) {
    console.error("Gmail callback error:", error)
    return NextResponse.redirect(
      new URL("/settings/email?error=callback_failed", request.url)
    )
  }
}
