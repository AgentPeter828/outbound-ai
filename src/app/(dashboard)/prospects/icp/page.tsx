"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  APOLLO_INDUSTRIES,
  APOLLO_EMPLOYEE_RANGES,
  APOLLO_FUNDING_STAGES,
} from "@/lib/apollo"
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Building2,
  DollarSign,
  Code,
  MapPin,
  Save,
  Sparkles,
} from "lucide-react"

interface IcpConfig {
  targetIndustries: string[]
  minEmployees: number
  maxEmployees: number
  targetFundingStages: string[]
  targetTechStack: string[]
  targetLocations: string[]
  keywords: string[]
}

const COMMON_TECH_STACK = [
  "React", "Angular", "Vue.js", "Node.js", "Python", "Ruby on Rails",
  "AWS", "Google Cloud", "Azure", "Kubernetes", "Docker",
  "Salesforce", "HubSpot", "Segment", "Stripe", "Twilio",
  "MongoDB", "PostgreSQL", "Redis", "Elasticsearch",
  "Slack", "Zoom", "Notion", "Figma", "GitHub",
]

const COMMON_LOCATIONS = [
  "United States", "San Francisco Bay Area", "New York City",
  "Los Angeles", "Boston", "Seattle", "Austin", "Denver",
  "United Kingdom", "London", "Germany", "France",
  "Canada", "Toronto", "Vancouver",
]

export default function IcpWizardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [presetName, setPresetName] = useState("")

  const [config, setConfig] = useState<IcpConfig>({
    targetIndustries: [],
    minEmployees: 11,
    maxEmployees: 500,
    targetFundingStages: [],
    targetTechStack: [],
    targetLocations: [],
    keywords: [],
  })

  const [keywordInput, setKeywordInput] = useState("")

  const handleIndustryToggle = (industry: string) => {
    setConfig(prev => ({
      ...prev,
      targetIndustries: prev.targetIndustries.includes(industry)
        ? prev.targetIndustries.filter(i => i !== industry)
        : [...prev.targetIndustries, industry],
    }))
  }

  const handleFundingToggle = (stage: string) => {
    setConfig(prev => ({
      ...prev,
      targetFundingStages: prev.targetFundingStages.includes(stage)
        ? prev.targetFundingStages.filter(s => s !== stage)
        : [...prev.targetFundingStages, stage],
    }))
  }

  const handleTechToggle = (tech: string) => {
    setConfig(prev => ({
      ...prev,
      targetTechStack: prev.targetTechStack.includes(tech)
        ? prev.targetTechStack.filter(t => t !== tech)
        : [...prev.targetTechStack, tech],
    }))
  }

  const handleLocationToggle = (location: string) => {
    setConfig(prev => ({
      ...prev,
      targetLocations: prev.targetLocations.includes(location)
        ? prev.targetLocations.filter(l => l !== location)
        : [...prev.targetLocations, location],
    }))
  }

  const addKeyword = () => {
    if (keywordInput.trim() && !config.keywords.includes(keywordInput.trim())) {
      setConfig(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }))
      setKeywordInput("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setConfig(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword),
    }))
  }

  const handleSave = async (saveAsPreset: boolean) => {
    setLoading(true)
    try {
      // Save ICP config to workspace
      const response = await fetch("/api/workspace/icp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          saveAsPreset,
          presetName: saveAsPreset ? presetName : undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to save ICP")

      toast({
        title: "ICP Saved",
        description: saveAsPreset
          ? `Your ICP "${presetName}" has been saved.`
          : "Your ideal customer profile has been updated.",
      })

      router.push("/prospects/discover")
    } catch {
      toast({
        title: "Error",
        description: "Failed to save ICP configuration.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const totalSelections =
    config.targetIndustries.length +
    config.targetFundingStages.length +
    config.targetTechStack.length +
    config.targetLocations.length +
    config.keywords.length

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/prospects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Define Your ICP</h1>
          <p className="text-muted-foreground">
            Configure your Ideal Customer Profile to find the best prospects
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1">
            <div
              className={`h-2 rounded-full ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Step 1: Industry */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Target Industries</CardTitle>
            </div>
            <CardDescription>
              Select the industries where your ideal customers operate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {APOLLO_INDUSTRIES.map((industry) => (
                <div
                  key={industry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    config.targetIndustries.includes(industry.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => handleIndustryToggle(industry.id)}
                >
                  <Checkbox
                    checked={config.targetIndustries.includes(industry.id)}
                    onCheckedChange={() => handleIndustryToggle(industry.id)}
                  />
                  <span className="text-sm">{industry.name}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <div />
              <Button onClick={() => setStep(2)}>
                Next: Company Size
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Company Size & Funding */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle>Company Size & Funding</CardTitle>
            </div>
            <CardDescription>
              Define the size and funding stage of your target companies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">Employee Count Range</Label>
              <div className="flex items-center gap-4">
                <Select
                  value={`${config.minEmployees}`}
                  onValueChange={(v) => setConfig(prev => ({ ...prev, minEmployees: parseInt(v) }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="11">11</SelectItem>
                    <SelectItem value="21">21</SelectItem>
                    <SelectItem value="51">51</SelectItem>
                    <SelectItem value="101">101</SelectItem>
                    <SelectItem value="201">201</SelectItem>
                    <SelectItem value="501">501</SelectItem>
                    <SelectItem value="1001">1001</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">to</span>
                <Select
                  value={`${config.maxEmployees}`}
                  onValueChange={(v) => setConfig(prev => ({ ...prev, maxEmployees: parseInt(v) }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                    <SelectItem value="5000">5000</SelectItem>
                    <SelectItem value="10000">10000+</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">employees</span>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="mb-3 block">Funding Stage</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {APOLLO_FUNDING_STAGES.map((stage) => (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      config.targetFundingStages.includes(stage.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleFundingToggle(stage.id)}
                  >
                    <Checkbox
                      checked={config.targetFundingStages.includes(stage.id)}
                      onCheckedChange={() => handleFundingToggle(stage.id)}
                    />
                    <span className="text-sm">{stage.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Tech Stack
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Tech Stack & Location */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <CardTitle>Tech Stack & Location</CardTitle>
            </div>
            <CardDescription>
              Target companies using specific technologies in specific regions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">Technologies (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_TECH_STACK.map((tech) => (
                  <Badge
                    key={tech}
                    variant={config.targetTechStack.includes(tech) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTechToggle(tech)}
                  >
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locations (optional)
              </Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_LOCATIONS.map((location) => (
                  <Badge
                    key={location}
                    variant={config.targetLocations.includes(location) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleLocationToggle(location)}
                  >
                    {location}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Next: Keywords & Save
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Keywords & Save */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Keywords & Review</CardTitle>
            </div>
            <CardDescription>
              Add custom keywords and review your ICP configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">Custom Keywords (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="e.g., AI, Machine Learning, SaaS"
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                />
                <Button type="button" variant="outline" onClick={addKeyword}>
                  Add
                </Button>
              </div>
              {config.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {config.keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeKeyword(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="font-medium">ICP Summary</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Industries</p>
                  <p className="font-medium">
                    {config.targetIndustries.length > 0
                      ? config.targetIndustries.map(id =>
                          APOLLO_INDUSTRIES.find(i => i.id === id)?.name
                        ).join(", ")
                      : "Any"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Company Size</p>
                  <p className="font-medium">
                    {config.minEmployees} - {config.maxEmployees} employees
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Funding Stages</p>
                  <p className="font-medium">
                    {config.targetFundingStages.length > 0
                      ? config.targetFundingStages.map(id =>
                          APOLLO_FUNDING_STAGES.find(s => s.id === id)?.name
                        ).join(", ")
                      : "Any"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tech Stack</p>
                  <p className="font-medium">
                    {config.targetTechStack.length > 0
                      ? config.targetTechStack.slice(0, 3).join(", ") +
                        (config.targetTechStack.length > 3 ? ` +${config.targetTechStack.length - 3}` : "")
                      : "Any"}
                  </p>
                </div>
              </div>
            </div>

            {/* Save as Preset Option */}
            <div className="space-y-3">
              <Label>Save as Preset (optional)</Label>
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Series A SaaS, Enterprise Tech"
              />
              <p className="text-xs text-muted-foreground">
                Save this configuration as a preset for quick access later
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save & Continue
                </Button>
                {presetName && (
                  <Button onClick={() => handleSave(true)} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save as Preset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
