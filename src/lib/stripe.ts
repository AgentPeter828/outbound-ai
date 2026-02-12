import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

export const PLANS = {
  pro: {
    name: 'Pro',
    price: 14900, // $149/month in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Unlimited companies & contacts',
      '500 enrichment credits/month',
      '1000 AI credits/month',
      '5 email accounts',
      'Meeting intelligence',
      'Advanced analytics',
    ],
    limits: {
      enrichmentCredits: 500,
      aiCredits: 1000,
      emailAccounts: 5,
    },
  },
} as const

export const USAGE_PRICES = {
  enrichment: {
    unitAmount: 10, // $0.10 per enrichment
    name: 'Contact Enrichment',
  },
  ai: {
    unitAmount: 1, // $0.01 per AI credit
    name: 'AI Credit',
  },
  transcription: {
    unitAmount: 5, // $0.05 per minute
    name: 'Transcription Minute',
  },
} as const

export async function createCheckoutSession({
  workspaceId,
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  workspaceId: string
  customerId?: string
  priceId: string
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      workspaceId,
    },
    subscription_data: {
      metadata: {
        workspaceId,
      },
    },
  })

  return session
}

export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

export async function createOrRetrieveCustomer({
  email,
  workspaceId,
  workspaceName,
}: {
  email: string
  workspaceId: string
  workspaceName: string
}) {
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }

  const customer = await stripe.customers.create({
    email,
    name: workspaceName,
    metadata: {
      workspaceId,
    },
  })

  return customer
}

export async function reportUsage({
  subscriptionItemId,
  quantity,
  timestamp,
}: {
  subscriptionItemId: string
  quantity: number
  timestamp?: number
}) {
  await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
    action: 'increment',
  })
}
