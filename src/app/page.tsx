import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import {
  Sparkles,
  Zap,
  Target,
  Mail,
  BarChart3,
  Users,
  ArrowRight,
  Video,
  Brain,
  Shield,
  Flame,
} from "lucide-react"

async function BusinessSelector() {
  const supabase = await createClient()

  const { data: businesses } = await supabase
    .from("businesses")
    .select("name, slug, description, status")
    .in("status", ["released", "scaling", "building", "validated"])
    .order("name")

  if (!businesses || businesses.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No businesses found. Add businesses in the Firestorm Dashboard first.
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
      {businesses.map((biz) => (
        <Link
          key={biz.slug}
          href={`/dashboard?business=${biz.slug}`}
          className="group"
        >
          <Card className="border shadow-md hover:shadow-xl hover:border-violet-300 transition-all group-hover:scale-[1.02]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{biz.name}</CardTitle>
                <Badge variant="secondary" className="text-xs capitalize">{biz.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {biz.description || "No description"}
              </p>
              <div className="mt-3 flex items-center text-sm text-violet-600 font-medium">
                Run Sales <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            <span className="font-bold text-xl">OutboundAI</span>
            <Badge variant="outline" className="ml-2 text-xs border-violet-200 text-violet-600">
              <Flame className="mr-1 h-3 w-3" />
              Firestorm
            </Badge>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="http://localhost:3000" className="text-sm">
                <ArrowRight className="mr-1.5 h-3.5 w-3.5 rotate-180" />
                Firestorm Dashboard
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-violet-600 hover:bg-violet-700">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50 to-white py-24 sm:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            Firestorm Internal Tool
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            OutboundAI —
            <span className="text-violet-600"> Firestorm Sales Engine</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            AI-powered outbound sales for your Firestorm portfolio businesses.
            From prospect discovery to closed deals — run sales campaigns for any business in the portfolio.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-violet-600 hover:bg-violet-700 text-base px-8 py-6">
              <Link href="#businesses">
                Select a Business
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8 py-6">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Capabilities</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Full-stack outbound sales for every portfolio business
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Six integrated systems that work together to generate pipeline and close deals.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Prospect Discovery",
                description: "Define the ICP for each business and let AI find perfect-fit companies. Score leads automatically based on fit and intent signals.",
                color: "text-blue-600 bg-blue-50",
              },
              {
                icon: Mail,
                title: "AI Email Sequences",
                description: "AI writes hyper-personalized emails for each prospect. Multi-step sequences with A/B testing and smart scheduling.",
                color: "text-violet-600 bg-violet-50",
              },
              {
                icon: Brain,
                title: "Smart Inbox",
                description: "AI classifies every reply — interested, objection, out-of-office, meeting request. Get suggested responses and next actions.",
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                icon: Video,
                title: "Meeting Intelligence",
                description: "Record, transcribe, and analyze every sales call. AI summaries, action items, objection tracking, and coaching.",
                color: "text-amber-600 bg-amber-50",
              },
              {
                icon: BarChart3,
                title: "Pipeline & Analytics",
                description: "Visual deal pipeline per business. Track conversion rates, email performance, meeting outcomes, and revenue forecasts.",
                color: "text-rose-600 bg-rose-50",
              },
              {
                icon: Shield,
                title: "AI Review Queue",
                description: "Every AI-generated email goes through quality control. Review, edit, and approve before sending. Full transparency.",
                color: "text-cyan-600 bg-cyan-50",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Select Business */}
      <section id="businesses" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              <Flame className="mr-1.5 h-3.5 w-3.5" />
              Portfolio
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Select a Business
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Choose a Firestorm portfolio business to run outbound sales campaigns.
            </p>
          </div>

          {/* @ts-expect-error Async Server Component */}
          <BusinessSelector />
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-violet-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to generate pipeline?
          </h2>
          <p className="mt-4 text-lg text-violet-100 max-w-xl mx-auto">
            Select a business above or go straight to the dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild className="text-base px-8 py-6">
              <Link href="/dashboard">
                Open Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              <span className="font-bold">OutboundAI</span>
              <span className="text-sm text-gray-400">— Firestorm Sales Engine</span>
            </div>
            <p className="text-sm text-gray-400">
              Internal tool · Project Firestorm
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
