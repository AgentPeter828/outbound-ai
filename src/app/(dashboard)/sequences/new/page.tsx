"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Mail,
  Clock,
  Loader2,
  Wand2,
} from "lucide-react"

interface SequenceStep {
  step_number: number
  delay_days: number
  subject_template: string
  body_template: string
  variant?: "A" | "B"
}

export default function NewSequencePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [steps, setSteps] = useState<SequenceStep[]>([
    {
      step_number: 1,
      delay_days: 0,
      subject_template: "",
      body_template: "",
    },
  ])

  // AI Generation inputs
  const [productDescription, setProductDescription] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [valueProposition, setValueProposition] = useState("")
  const [tone, setTone] = useState<"professional" | "casual" | "friendly">("professional")
  const [numberOfSteps, setNumberOfSteps] = useState(3)

  // Settings
  const [settings, setSettings] = useState({
    skipWeekends: true,
    maxPerDay: 50,
    sendWindowStart: "09:00",
    sendWindowEnd: "18:00",
    timezone: "America/New_York",
    enableABTesting: false,
  })

  const addStep = () => {
    const lastStep = steps[steps.length - 1]
    setSteps([
      ...steps,
      {
        step_number: steps.length + 1,
        delay_days: 3,
        subject_template: "",
        body_template: "",
      },
    ])
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index)
      // Renumber steps
      newSteps.forEach((step, i) => {
        step.step_number = i + 1
      })
      setSteps(newSteps)
    }
  }

  const updateStep = (index: number, updates: Partial<SequenceStep>) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setSteps(newSteps)
  }

  const generateWithAI = async () => {
    if (!productDescription || !targetAudience) {
      toast({
        title: "Missing Information",
        description: "Please provide product description and target audience.",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/ai/generate-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productDescription,
          targetAudience,
          valueProposition,
          tone,
          numberOfSteps,
        }),
      })

      if (!response.ok) throw new Error("Generation failed")

      const data = await response.json()

      // Update steps with AI-generated content
      setSteps(data.steps.map((step: SequenceStep, index: number) => ({
        step_number: index + 1,
        delay_days: step.delay_days || (index === 0 ? 0 : 3),
        subject_template: step.subject_template,
        body_template: step.body_template,
      })))

      // Auto-generate name if not set
      if (!name) {
        setName(`${targetAudience} Outreach`)
      }

      toast({
        title: "Sequence Generated",
        description: `Created ${data.steps.length} email steps. Review and customize as needed.`,
      })
    } catch {
      toast({
        title: "Generation Failed",
        description: "Unable to generate sequence. Please try again.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (activate: boolean = false) => {
    if (!name) {
      toast({
        title: "Name Required",
        description: "Please provide a name for your sequence.",
        variant: "destructive",
      })
      return
    }

    if (steps.some(s => !s.subject_template || !s.body_template)) {
      toast({
        title: "Incomplete Steps",
        description: "Please fill in subject and body for all steps.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          status: activate ? "active" : "draft",
          steps,
          settings,
        }),
      })

      if (!response.ok) throw new Error("Failed to save sequence")

      const data = await response.json()

      toast({
        title: activate ? "Sequence Activated" : "Sequence Saved",
        description: activate
          ? "Your sequence is now live and ready to send."
          : "Your sequence has been saved as a draft.",
      })

      router.push(`/sequences/${data.id}`)
    } catch {
      toast({
        title: "Save Failed",
        description: "Unable to save sequence. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sequences">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Sequence</h1>
          <p className="text-muted-foreground">
            Build an automated email sequence for your prospects
          </p>
        </div>
      </div>

      {/* AI Generation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Sequence Generator</CardTitle>
          </div>
          <CardDescription>
            Describe your product and target audience to generate a complete email sequence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Product Description</Label>
              <Textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe what your product does and the problem it solves..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Who are you targeting? e.g., VP of Engineering at Series A startups..."
                rows={3}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Value Proposition (optional)</Label>
            <Input
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              placeholder="What's the main benefit? e.g., Reduce engineering costs by 40%"
            />
          </div>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Steps</Label>
              <Select value={`${numberOfSteps}`} onValueChange={(v) => setNumberOfSteps(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateWithAI} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Sequence
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sequence Details */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sequence Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Series A SaaS Outreach"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this sequence's purpose"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Steps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Email Steps</CardTitle>
          <Button variant="outline" size="sm" onClick={addStep}>
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <Badge variant="outline">Step {step.step_number}</Badge>
                  {index > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <Select
                        value={`${step.delay_days}`}
                        onValueChange={(v) => updateStep(index, { delay_days: parseInt(v) })}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="2">2 days</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="5">5 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                        </SelectContent>
                      </Select>
                      after previous
                    </div>
                  )}
                </div>
                {steps.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={step.subject_template}
                  onChange={(e) => updateStep(index, { subject_template: e.target.value })}
                  placeholder="Use {{firstName}}, {{company}} for personalization"
                />
              </div>

              <div className="space-y-2">
                <Label>Email Body</Label>
                <Textarea
                  value={step.body_template}
                  onChange={(e) => updateStep(index, { body_template: e.target.value })}
                  placeholder="Write your email... Use {{firstName}}, {{company}}, {{industry}} for personalization"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{"{{firstName}}"}</Badge>
                <Badge variant="secondary">{"{{lastName}}"}</Badge>
                <Badge variant="secondary">{"{{company}}"}</Badge>
                <Badge variant="secondary">{"{{industry}}"}</Badge>
                <Badge variant="secondary">{"{{title}}"}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Send Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Skip Weekends</Label>
              <p className="text-sm text-muted-foreground">
                Don&apos;t send emails on Saturday and Sunday
              </p>
            </div>
            <Switch
              checked={settings.skipWeekends}
              onCheckedChange={(checked) => setSettings({ ...settings, skipWeekends: checked })}
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Send Window Start</Label>
              <Input
                type="time"
                value={settings.sendWindowStart}
                onChange={(e) => setSettings({ ...settings, sendWindowStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Send Window End</Label>
              <Input
                type="time"
                value={settings.sendWindowEnd}
                onChange={(e) => setSettings({ ...settings, sendWindowEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Max Emails Per Day</Label>
            <Select
              value={`${settings.maxPerDay}`}
              onValueChange={(v) => setSettings({ ...settings, maxPerDay: parseInt(v) })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="75">75</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>A/B Testing</Label>
              <p className="text-sm text-muted-foreground">
                Test different subject lines or email bodies
              </p>
            </div>
            <Switch
              checked={settings.enableABTesting}
              onCheckedChange={(checked) => setSettings({ ...settings, enableABTesting: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
          Save as Draft
        </Button>
        <Button onClick={() => handleSave(true)} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Save & Activate
        </Button>
      </div>
    </div>
  )
}
