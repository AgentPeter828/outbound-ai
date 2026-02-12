"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Plug,
  Mail,
  Calendar,
  Database,
  MessageSquare,
  Video,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
} from "lucide-react"

interface Integration {
  id: string
  name: string
  description: string
  icon: typeof Mail
  category: "email" | "calendar" | "crm" | "communication" | "data"
  status: "connected" | "disconnected" | "coming_soon"
  connectedAt?: string
  metadata?: Record<string, string>
}

const INTEGRATIONS: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Send emails from your Gmail account",
    icon: Mail,
    category: "email",
    status: "disconnected",
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Send emails from your Outlook account",
    icon: Mail,
    category: "email",
    status: "coming_soon",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync meetings and availability",
    icon: Calendar,
    category: "calendar",
    status: "disconnected",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Sync contacts and deals with Salesforce",
    icon: Database,
    category: "crm",
    status: "coming_soon",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts and deals with HubSpot",
    icon: Database,
    category: "crm",
    status: "coming_soon",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications in Slack",
    icon: MessageSquare,
    category: "communication",
    status: "disconnected",
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Automatically record and transcribe Zoom calls",
    icon: Video,
    category: "communication",
    status: "disconnected",
  },
  {
    id: "apollo",
    name: "Apollo.io",
    description: "Enrich contacts and find prospects",
    icon: Database,
    category: "data",
    status: "connected",
    connectedAt: "2024-02-15",
    metadata: { credits_remaining: "4,500" },
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  email: "Email",
  calendar: "Calendar",
  crm: "CRM",
  communication: "Communication",
  data: "Data & Enrichment",
}

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState(INTEGRATIONS)

  const handleConnect = (id: string) => {
    if (id === "gmail") {
      window.location.href = "/api/integrations/gmail/connect"
      return
    }

    // Simulate connection for other integrations
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: "connected" as const, connectedAt: new Date().toISOString() }
          : i
      )
    )

    toast({
      title: "Integration Connected",
      description: `${integrations.find((i) => i.id === id)?.name} has been connected.`,
    })
  }

  const handleDisconnect = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: "disconnected" as const, connectedAt: undefined }
          : i
      )
    )

    toast({
      title: "Integration Disconnected",
      description: `${integrations.find((i) => i.id === id)?.name} has been disconnected.`,
    })
  }

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = []
    }
    acc[integration.category].push(integration)
    return acc
  }, {} as Record<string, Integration[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your favorite tools and services
          </p>
        </div>
      </div>

      {/* Integration Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {integrations.filter((i) => i.status === "connected").length}
              </p>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
              <AlertCircle className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {integrations.filter((i) => i.status === "disconnected").length}
              </p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Plug className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {integrations.filter((i) => i.status === "coming_soon").length}
              </p>
              <p className="text-sm text-muted-foreground">Coming Soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations by Category */}
      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABELS[category]}</CardTitle>
            <CardDescription>
              {category === "email" && "Connect your email provider to send outreach"}
              {category === "calendar" && "Sync your calendar for scheduling"}
              {category === "crm" && "Keep your CRM in sync"}
              {category === "communication" && "Get notified and record calls"}
              {category === "data" && "Enrich and find prospects"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryIntegrations.map((integration) => {
                const Icon = integration.icon
                return (
                  <div
                    key={integration.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      integration.status === "coming_soon" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{integration.name}</p>
                          {integration.status === "connected" && (
                            <Badge variant="secondary" className="text-green-600 bg-green-100">
                              Connected
                            </Badge>
                          )}
                          {integration.status === "coming_soon" && (
                            <Badge variant="outline">Coming Soon</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                        {integration.connectedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Connected since{" "}
                            {new Date(integration.connectedAt).toLocaleDateString()}
                            {integration.metadata?.credits_remaining && (
                              <> | {integration.metadata.credits_remaining} credits remaining</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.status === "connected" && (
                        <>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(integration.id)}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                      {integration.status === "disconnected" && (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(integration.id)}
                        >
                          Connect
                        </Button>
                      )}
                      {integration.status === "coming_soon" && (
                        <Button variant="outline" size="sm" disabled>
                          Notify Me
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* API Access */}
      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
          <CardDescription>
            Build custom integrations with our API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">API Key</p>
              <p className="text-sm text-muted-foreground">
                Use this key to authenticate API requests
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-muted rounded text-sm">
                sk_live_••••••••••••••••
              </code>
              <Button variant="outline" size="sm">
                Regenerate
              </Button>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href="https://docs.outboundai.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View API Documentation
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
