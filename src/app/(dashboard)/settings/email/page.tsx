"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Mail,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Plus,
} from "lucide-react"

export default function EmailSettingsPage() {
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [settings, setSettings] = useState({
    dailyLimit: 100,
    delayBetweenEmails: 60,
    workingHoursOnly: true,
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    timezone: "America/New_York",
    aiConfidenceThreshold: 90,
    autoApproveHighConfidence: true,
    signature: "",
  })

  const handleConnect = () => {
    // In production, this would redirect to OAuth
    window.location.href = "/api/integrations/gmail/connect"
  }

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your email settings have been updated.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure your email sending preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Account
            </CardTitle>
            <CardDescription>
              Connect your email to send outreach as yourself
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">user@example.com</p>
                      <p className="text-sm text-muted-foreground">
                        Gmail connected
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Disconnect
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Sending as you
                  </Badge>
                  <span>Emails appear from your actual inbox</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg border-dashed">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No email connected</p>
                      <p className="text-sm text-muted-foreground">
                        Connect Gmail or Outlook to start sending
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleConnect}>
                    <Plus className="mr-2 h-4 w-4" />
                    Connect Gmail
                  </Button>
                  <Button variant="outline">Connect Outlook</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sending Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Sending Limits
            </CardTitle>
            <CardDescription>
              Configure sending rate to maintain deliverability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Daily Email Limit</Label>
                <span className="text-sm font-medium">
                  {settings.dailyLimit} emails/day
                </span>
              </div>
              <Slider
                value={[settings.dailyLimit]}
                onValueChange={(v) => setSettings({ ...settings, dailyLimit: v[0] })}
                max={200}
                min={10}
                step={10}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 50-100 for new accounts, up to 200 for warmed accounts
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Delay Between Emails</Label>
                <span className="text-sm font-medium">
                  {settings.delayBetweenEmails} seconds
                </span>
              </div>
              <Slider
                value={[settings.delayBetweenEmails]}
                onValueChange={(v) => setSettings({ ...settings, delayBetweenEmails: v[0] })}
                max={300}
                min={30}
                step={15}
              />
              <p className="text-xs text-muted-foreground">
                Longer delays appear more natural and improve deliverability
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Working Hours
            </CardTitle>
            <CardDescription>
              Send emails during optimal hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send During Working Hours Only</Label>
                <p className="text-sm text-muted-foreground">
                  Emails are queued outside working hours
                </p>
              </div>
              <Switch
                checked={settings.workingHoursOnly}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, workingHoursOnly: checked })
                }
              />
            </div>

            {settings.workingHoursOnly && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={settings.workingHoursStart}
                      onChange={(e) =>
                        setSettings({ ...settings, workingHoursStart: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={settings.workingHoursEnd}
                      onChange={(e) =>
                        setSettings({ ...settings, workingHoursEnd: e.target.value })
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Email Settings
            </CardTitle>
            <CardDescription>
              Configure AI-generated email approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Approve High Confidence</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically approve emails above threshold
                </p>
              </div>
              <Switch
                checked={settings.autoApproveHighConfidence}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoApproveHighConfidence: checked })
                }
              />
            </div>

            {settings.autoApproveHighConfidence && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Confidence Threshold</Label>
                    <span className="text-sm font-medium">
                      {settings.aiConfidenceThreshold}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.aiConfidenceThreshold]}
                    onValueChange={(v) =>
                      setSettings({ ...settings, aiConfidenceThreshold: v[0] })
                    }
                    max={100}
                    min={70}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Emails with AI confidence below this threshold require manual review
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Email Signature */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Email Signature</CardTitle>
            <CardDescription>
              Add a signature to all outgoing emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full min-h-32 p-3 border rounded-md text-sm resize-none"
              placeholder="Best regards,

John Doe
Sales Representative
(555) 123-4567"
              value={settings.signature}
              onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{senderName}}"} for dynamic sender name replacement
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  )
}
