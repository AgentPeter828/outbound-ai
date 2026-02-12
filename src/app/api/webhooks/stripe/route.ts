import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const supabase = await createClient()

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const workspaceId = session.metadata?.workspace_id

        if (workspaceId && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          await supabase
            .from("workspaces")
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              plan: subscription.items.data[0]?.price.lookup_key || "pro",
              plan_status: subscription.status,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            })
            .eq("id", workspaceId)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (workspace) {
          await supabase
            .from("workspaces")
            .update({
              plan: subscription.items.data[0]?.price.lookup_key || "pro",
              plan_status: subscription.status,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            })
            .eq("id", workspace.id)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (workspace) {
          await supabase
            .from("workspaces")
            .update({
              plan: "free",
              plan_status: "canceled",
              stripe_subscription_id: null,
            })
            .eq("id", workspace.id)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (workspace) {
          // Reset usage credits on successful payment
          await supabase
            .from("workspaces")
            .update({
              credits_used: 0,
              credits_included: 1000, // Reset to plan default
            })
            .eq("id", workspace.id)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (workspace) {
          await supabase
            .from("workspaces")
            .update({
              plan_status: "past_due",
            })
            .eq("id", workspace.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
