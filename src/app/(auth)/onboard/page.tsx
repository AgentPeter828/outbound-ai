"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Sparkles,
  Building2,
  Target,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
} from "lucide-react"

const STEPS = [
  { id: "workspace", title: "Workspace", icon: Building2 },
  { id: "icp", title: "Ideal Customer", icon: Target },
  { id: "email", title: "Email Setup", icon: Mail },
  { id: "complete", title: "Complete", icon: CheckCircle },
]

const INDUSTRIES = [
  "SaaS",
  "Fintech",
  "Healthcare",
  "E-commerce",
  "Enterprise Software",
  "Developer Tools",
  "Marketing Tech",
  "HR Tech",
  "Other",
]

const COMPANY_SIZES = [
  { label: "1-10", value: "1-10" },
  { label: "11-50", value: "11-50" },
  { label: "51-200", value: "51-200" },
  { label: "201-500", value: "201-500" },
  { label: "501-1000", value: "501-1000" },
  { label: "1000+", value: "1000+" },
]

const TITLES = [
  "Founder/CEO",
  "VP Sales",
  "VP Marketing",
  "Head of Growth",
  "SDR/BDR Manager",
  "CTO/VP Engineering",
  "Product Lead",
  "Other",
]

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [workspaceData, setWorkspaceData] = useState({
    name: "",
    domain: "",
  })

  const [icpData, setIcpData] = useState({
    industries: [] as string[],
    companySizes: [] as string[],
    titles: [] as string[],
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const toggleIndustry = (industry: string) => {
    setIcpData((prev) => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter((i) => i !== industry)
        : [...prev.industries, industry],
    }))
  }

  const toggleCompanySize = (size: string) => {
    setIcpData((prev) => ({
      ...prev,
      companySizes: prev.companySizes.includes(size)
        ? prev.companySizes.filter((s) => s !== size)
        : [...prev.companySizes, size],
    }))
  }

  const toggleTitle = (title: string) => {
    setIcpData((prev) => ({
      ...prev,
      titles: prev.titles.includes(title)
        ? prev.titles.filter((t) => t !== title)
        : [...prev.titles, title],
    }))
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      // Validate workspace data
      if (!workspaceData.name) {
        toast({
          title: "Required",
          description: "Please enter your workspace name.",
          variant: "destructive",
        })
        return
      }
    }

    if (currentStep === 1) {
      // Validate ICP data
      if (icpData.industries.length === 0) {
        toast({
          title: "Required",
          description: "Please select at least one industry.",
          variant: "destructive",
        })
        return
      }
    }

    if (currentStep === 2) {
      // Save onboarding data and complete
      setIsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Get the user's workspace
          const { data: membership } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", user.id)
            .single()

          if (membership) {
            // Update workspace with onboarding data
            await supabase
              .from("workspaces")
              .update({
                name: workspaceData.name,
                domain: workspaceData.domain,
                icp_criteria: {
                  industries: icpData.industries,
                  employee_ranges: icpData.companySizes,
                  titles: icpData.titles,
                },
                onboarding_completed: true,
              })
              .eq("id", membership.workspace_id)
          }
        }

        setCurrentStep(3)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save settings. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
      return
    }

    if (currentStep === 3) {
      router.push("/dashboard")
      return
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleConnectEmail = () => {
    window.location.href = "/api/integrations/gmail/connect"
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">OutboundAI</span>
          </div>
          <div className="flex items-center gap-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  index <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <step.icon className={`h-4 w-4 ${index < currentStep ? "text-green-500" : ""}`} />
                <span className="text-sm hidden sm:inline">{step.title}</span>
                {index < STEPS.length - 1 && (
                  <span className="text-muted-foreground mx-2">/</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Progress */}
      <Progress value={progress} className="h-1" />

      {/* Content */}
      <main className="flex-1 container py-12">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Workspace Setup */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Set up your workspace</CardTitle>
                <CardDescription>
                  Tell us about your company so we can personalize your experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="Acme Inc"
                    value={workspaceData.name}
                    onChange={(e) =>
                      setWorkspaceData({ ...workspaceData, name: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    This is how your team will see your workspace.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Company Domain</Label>
                  <Input
                    id="domain"
                    placeholder="acme.com"
                    value={workspaceData.domain}
                    onChange={(e) =>
                      setWorkspaceData({ ...workspaceData, domain: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for email verification and branding.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: ICP Definition */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Define your Ideal Customer Profile</CardTitle>
                <CardDescription>
                  Help our AI understand who you're trying to reach.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Target Industries</Label>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map((industry) => (
                      <Badge
                        key={industry}
                        variant={icpData.industries.includes(industry) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleIndustry(industry)}
                      >
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Company Size</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMPANY_SIZES.map((size) => (
                      <Badge
                        key={size.value}
                        variant={icpData.companySizes.includes(size.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleCompanySize(size.value)}
                      >
                        {size.label} employees
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Target Titles</Label>
                  <div className="flex flex-wrap gap-2">
                    {TITLES.map((title) => (
                      <Badge
                        key={title}
                        variant={icpData.titles.includes(title) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTitle(title)}
                      >
                        {title}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Email Setup */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Connect your email</CardTitle>
                <CardDescription>
                  Send emails directly from your inbox for better deliverability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-center text-muted-foreground mb-6 max-w-sm">
                    Connect your Gmail or Outlook account to send personalized
                    outreach emails that appear to come directly from you.
                  </p>
                  <div className="flex gap-4">
                    <Button onClick={handleConnectEmail}>
                      Connect Gmail
                    </Button>
                    <Button variant="outline">
                      Connect Outlook
                    </Button>
                  </div>
                </div>
                <div className="text-center">
                  <Button variant="link" onClick={handleNext}>
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Complete */}
          {currentStep === 3 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
                <p className="text-muted-foreground text-center max-w-md mb-8">
                  Your workspace is ready. Start by exploring prospects or
                  creating your first sequence.
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => router.push("/prospects/discover")}>
                    Find Prospects
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/sequences/new")}>
                    Create Sequence
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === 3 ? "Go to Dashboard" : "Continue"}
              {currentStep !== 3 && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
