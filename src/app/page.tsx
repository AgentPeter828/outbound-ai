import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Zap,
  Target,
  Mail,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle,
  Star,
  Video,
  Brain,
  Shield,
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            <span className="font-bold text-xl">OutboundAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground">Testimonials</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-violet-600 hover:bg-violet-700">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50 to-white py-24 sm:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            AI-Native Sales Platform
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Turn cold prospects into
            <span className="text-violet-600"> closed deals</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            OutboundAI is the AI-native B2B sales platform built for Seed & Series A startups.
            From prospect discovery to meeting intelligence — everything your sales team needs, powered by AI.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-violet-600 hover:bg-violet-700 text-base px-8 py-6">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8 py-6">
              <Link href="#demo">Watch Demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500">No credit card required · 14-day free trial · Cancel anytime</p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-medium text-gray-500 mb-6">
            TRUSTED BY FAST-GROWING STARTUPS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
            {["TechFlow", "Launchpad AI", "CloudScale", "DataPipe", "NexaStack"].map((company) => (
              <span key={company} className="text-xl font-bold text-gray-400">{company}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to close more deals
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Six integrated systems that work together to supercharge your sales pipeline.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Prospect Discovery",
                description: "Define your ICP and let AI find perfect-fit companies using Apollo.io enrichment. Score leads automatically based on fit and intent signals.",
                color: "text-blue-600 bg-blue-50",
              },
              {
                icon: Mail,
                title: "AI Email Sequences",
                description: "Claude Sonnet 4 writes hyper-personalized emails. Multi-step sequences with A/B testing, smart scheduling, and auto-approval for high-confidence drafts.",
                color: "text-violet-600 bg-violet-50",
              },
              {
                icon: Brain,
                title: "Smart Inbox",
                description: "Kimi K2 classifies every reply instantly — interested, objection, out-of-office, meeting request. Get suggested responses and next actions automatically.",
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                icon: Video,
                title: "Meeting Intelligence",
                description: "Record, transcribe, and analyze every sales call. Get AI-generated summaries, action items, objection tracking, and coaching suggestions.",
                color: "text-amber-600 bg-amber-50",
              },
              {
                icon: BarChart3,
                title: "Pipeline & Analytics",
                description: "Visual deal pipeline with drag-and-drop stages. Track conversion rates, email performance, meeting outcomes, and revenue forecasts in real-time.",
                color: "text-rose-600 bg-rose-50",
              },
              {
                icon: Shield,
                title: "AI Review Queue",
                description: "Every AI-generated email goes through quality control. Review, edit, and approve before sending. Full transparency and control over your outreach.",
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

      {/* How It Works */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              From zero to pipeline in minutes
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Define Your ICP", description: "Tell us your ideal customer — industry, size, tech stack, seniority. We'll find them." },
              { step: "2", title: "Launch Sequences", description: "AI writes personalized emails for each prospect. Review, tweak, and send." },
              { step: "3", title: "Close Deals", description: "Smart inbox handles replies. Meeting intel prepares you. Pipeline tracks everything." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl font-bold mb-6">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">Start free. Scale as you grow.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$0",
                period: "forever",
                description: "Perfect for testing the waters",
                features: ["100 prospect searches/mo", "50 AI emails/mo", "1 sequence", "Basic analytics", "Email support"],
                cta: "Get Started",
                popular: false,
              },
              {
                name: "Pro",
                price: "$149",
                period: "/month",
                description: "For serious sales teams",
                features: ["Unlimited prospect searches", "500 AI emails/mo", "Unlimited sequences", "Meeting intelligence", "Priority support", "API access", "Team collaboration"],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Scale",
                price: "$399",
                period: "/month",
                description: "For high-volume outbound",
                features: ["Everything in Pro", "2,000 AI emails/mo", "Advanced analytics", "Custom integrations", "Dedicated CSM", "SLA guarantee", "SSO & audit logs"],
                cta: "Contact Sales",
                popular: false,
              },
            ].map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? 'border-violet-600 border-2 shadow-xl scale-105' : 'border shadow-lg'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 text-white px-4">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-violet-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full ${plan.popular ? 'bg-violet-600 hover:bg-violet-700' : ''}`} variant={plan.popular ? "default" : "outline"} asChild>
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by sales teams
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                quote: "OutboundAI replaced 4 different tools for us. The AI-written emails get 3x the response rate of our old templates.",
                name: "Sarah Chen",
                role: "Head of Sales, TechFlow",
                stars: 5,
              },
              {
                quote: "The meeting intelligence feature is a game-changer. I walk into every call fully prepared with talking points and objection handlers.",
                name: "Marcus Johnson",
                role: "AE, CloudScale",
                stars: 5,
              },
              {
                quote: "We went from 0 to 50 qualified meetings in our first month. The prospect discovery + AI sequences combo is incredibly powerful.",
                name: "Alex Rivera",
                role: "Founder, DataPipe",
                stars: 5,
              },
            ].map((testimonial) => (
              <Card key={testimonial.name} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-violet-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to supercharge your sales?
          </h2>
          <p className="mt-4 text-lg text-violet-100 max-w-xl mx-auto">
            Join hundreds of startups using OutboundAI to build pipeline faster.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild className="text-base px-8 py-6">
              <Link href="/signup">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-violet-200">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <span className="font-bold">OutboundAI</span>
              </Link>
              <p className="text-sm text-gray-500">
                AI-native B2B sales platform for startups that need to move fast.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="#features" className="hover:text-gray-900">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-gray-900">Pricing</Link></li>
                <li><Link href="/changelog" className="hover:text-gray-900">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/about" className="hover:text-gray-900">About</Link></li>
                <li><Link href="/blog" className="hover:text-gray-900">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-gray-900">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-gray-900">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} OutboundAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
