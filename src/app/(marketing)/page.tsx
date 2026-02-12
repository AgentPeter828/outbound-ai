import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Mail,
  Users,
  BarChart3,
  Video,
  Target,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle,
  Star,
  Play,
} from "lucide-react"

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Powered Sequences",
    description: "Generate personalized email sequences with Claude AI. Each email is crafted based on prospect research and context.",
  },
  {
    icon: Target,
    title: "Smart Prospect Discovery",
    description: "Define your ICP once and let AI surface the best prospects. Auto-enrich with firmographic and technographic data.",
  },
  {
    icon: Mail,
    title: "Human-in-the-Loop",
    description: "AI drafts, you approve. Review and edit emails before sending to maintain authenticity and quality.",
  },
  {
    icon: Video,
    title: "Meeting Intelligence",
    description: "Automatic transcription and AI summaries of your sales calls. Never miss an action item again.",
  },
  {
    icon: BarChart3,
    title: "Pipeline Analytics",
    description: "Real-time insights into your pipeline health, sequence performance, and rep productivity.",
  },
  {
    icon: Users,
    title: "AI-Native CRM",
    description: "Auto-logging interactions, smart lead scoring, and AI-suggested next best actions.",
  },
]

const TESTIMONIALS = [
  {
    quote: "OutboundAI cut our SDR ramp time in half. The AI-generated emails are indistinguishable from human-written ones.",
    author: "Sarah Chen",
    title: "VP Sales, TechCorp",
    rating: 5,
  },
  {
    quote: "We went from 0 to $500K ARR in 6 months using OutboundAI. The meeting intelligence feature alone is worth the price.",
    author: "Michael Park",
    title: "Founder, Startup.io",
    rating: 5,
  },
  {
    quote: "Finally, an outreach tool that doesn't feel like spam. The personalization is incredible.",
    author: "Emily Watson",
    title: "Head of Growth, GrowthCo",
    rating: 5,
  },
]

const PRICING = [
  {
    name: "Starter",
    price: 149,
    description: "Perfect for early-stage startups",
    features: [
      "1,000 AI credits/month",
      "Up to 3 team members",
      "Email sequences",
      "Basic analytics",
      "Standard support",
    ],
  },
  {
    name: "Growth",
    price: 349,
    popular: true,
    description: "For scaling sales teams",
    features: [
      "5,000 AI credits/month",
      "Up to 10 team members",
      "Email + meeting intelligence",
      "Advanced analytics",
      "Priority support",
      "Custom sequences",
    ],
  },
  {
    name: "Enterprise",
    price: null,
    description: "For large organizations",
    features: [
      "Unlimited AI credits",
      "Unlimited team members",
      "All features",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by Claude AI
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              AI-Native Sales Platform for{" "}
              <span className="text-primary">Startup Growth</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              From prospect discovery to closed deals. OutboundAI automates your
              entire sales workflow with AI that actually works.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#demo">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              14-day free trial. No credit card required.
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="rounded-xl border shadow-2xl overflow-hidden bg-background">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Trusted by fast-growing startups
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50">
            {["Company A", "Company B", "Company C", "Company D", "Company E"].map((company) => (
              <div key={company} className="text-xl font-bold text-muted-foreground">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to scale outbound
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI handles the heavy lifting so your team can focus on what matters:
              building relationships and closing deals.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              From setup to revenue in 3 steps
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Define Your ICP",
                description: "Tell us who your ideal customers are. Industry, company size, technologies, titles - we'll find them.",
              },
              {
                step: "2",
                title: "AI Creates Sequences",
                description: "Claude generates personalized email sequences based on your messaging and each prospect's context.",
              },
              {
                step: "3",
                title: "Review & Send",
                description: "Approve AI-drafted emails with one click. Track responses and let AI handle follow-ups.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                </div>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by sales teams everywhere
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg mb-6">&quot;{testimonial.quote}&quot;</p>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. All plans include a 14-day trial.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.popular ? "border-primary ring-1 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {plan.price !== null ? (
                      <>
                        <span className="text-4xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">Custom</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                    <Link href="/signup">
                      {plan.price !== null ? "Start Free Trial" : "Contact Sales"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to supercharge your sales?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join hundreds of startups already using OutboundAI to close more deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Talk to Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
