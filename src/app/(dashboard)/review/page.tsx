"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getInitials, truncate } from "@/lib/utils"
import {
  Inbox,
  CheckCircle,
  XCircle,
  Edit,
  Send,
  Sparkles,
  AlertTriangle,
  Clock,
  Building2,
  ChevronRight,
  ChevronLeft,
  CheckCheck,
} from "lucide-react"

interface PendingEmail {
  id: string
  contact: {
    id: string
    first_name: string
    last_name: string
    email: string
    company: { name: string } | null
  }
  sequence: {
    name: string
    step_number: number
  }
  subject: string
  body: string
  ai_confidence: number
  created_at: string
}

// Mock data - in production this would come from the server
const MOCK_PENDING: PendingEmail[] = [
  {
    id: "1",
    contact: {
      id: "c1",
      first_name: "Sarah",
      last_name: "Chen",
      email: "sarah@example.com",
      company: { name: "TechCorp" },
    },
    sequence: { name: "Series A SaaS Outreach", step_number: 1 },
    subject: "Quick question about TechCorp's growth plans",
    body: `Hi Sarah,

I noticed TechCorp recently raised a Series A - congratulations! I've been working with similar companies to help them scale their sales operations.

Would you be open to a quick call next week to discuss how we might be able to help?

Best,
{{senderName}}`,
    ai_confidence: 92,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    contact: {
      id: "c2",
      first_name: "Michael",
      last_name: "Park",
      email: "michael@startup.io",
      company: { name: "Startup.io" },
    },
    sequence: { name: "Series A SaaS Outreach", step_number: 2 },
    subject: "Following up on my previous email",
    body: `Hi Michael,

I wanted to follow up on my previous email. I understand you're busy, but I think there's a real opportunity here for Startup.io.

We've helped companies like yours reduce their sales cycle by 40%. Would 15 minutes this week work for a quick chat?

Best,
{{senderName}}`,
    ai_confidence: 88,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    contact: {
      id: "c3",
      first_name: "Emily",
      last_name: "Watson",
      email: "emily@enterprise.com",
      company: { name: "Enterprise Co" },
    },
    sequence: { name: "Enterprise Outreach", step_number: 1 },
    subject: "Improving Enterprise Co's sales efficiency",
    body: `Dear Emily,

I hope this email finds you well. I'm reaching out because I believe there's a significant opportunity to improve Enterprise Co's sales efficiency.

Based on my research, it seems like you're the right person to discuss this with. Would you have 20 minutes next week for a brief call?

Looking forward to your response,
{{senderName}}`,
    ai_confidence: 75,
    created_at: new Date().toISOString(),
  },
]

export default function ReviewPage() {
  const { toast } = useToast()
  const [pendingEmails, setPendingEmails] = useState<PendingEmail[]>(MOCK_PENDING)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentEmail, setCurrentEmail] = useState<PendingEmail | null>(
    pendingEmails[0] || null
  )
  const [editedBody, setEditedBody] = useState(currentEmail?.body || "")
  const [isEditing, setIsEditing] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === pendingEmails.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingEmails.map((e) => e.id)))
    }
  }

  const handleApprove = async (id: string) => {
    // In production, this would call the API
    setPendingEmails((prev) => prev.filter((e) => e.id !== id))
    toast({
      title: "Email Approved",
      description: "The email has been queued for sending.",
      variant: "success",
    })

    // Move to next email
    const remaining = pendingEmails.filter((e) => e.id !== id)
    setCurrentEmail(remaining[0] || null)
    setEditedBody(remaining[0]?.body || "")
    setIsEditing(false)
  }

  const handleReject = async (id: string) => {
    setPendingEmails((prev) => prev.filter((e) => e.id !== id))
    toast({
      title: "Email Rejected",
      description: "The contact has been removed from the sequence.",
    })

    const remaining = pendingEmails.filter((e) => e.id !== id)
    setCurrentEmail(remaining[0] || null)
    setEditedBody(remaining[0]?.body || "")
    setIsEditing(false)
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return

    setPendingEmails((prev) => prev.filter((e) => !selectedIds.has(e.id)))
    toast({
      title: `${selectedIds.size} Emails Approved`,
      description: "The emails have been queued for sending.",
      variant: "success",
    })
    setSelectedIds(new Set())

    const remaining = pendingEmails.filter((e) => !selectedIds.has(e.id))
    setCurrentEmail(remaining[0] || null)
  }

  const handleSaveEdit = () => {
    // In production, save the edited email
    setIsEditing(false)
    toast({
      title: "Changes Saved",
      description: "Your edits have been saved.",
    })
  }

  const selectEmail = (email: PendingEmail) => {
    setCurrentEmail(email)
    setEditedBody(email.body)
    setIsEditing(false)
  }

  const currentIndex = currentEmail
    ? pendingEmails.findIndex((e) => e.id === currentEmail.id)
    : -1

  const goToNext = () => {
    if (currentIndex < pendingEmails.length - 1) {
      selectEmail(pendingEmails[currentIndex + 1])
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      selectEmail(pendingEmails[currentIndex - 1])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground">
            Review AI-generated emails before sending
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {pendingEmails.length} pending
          </Badge>
          {selectedIds.size > 0 && (
            <Button onClick={handleBulkApprove}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Approve {selectedIds.size} Selected
            </Button>
          )}
        </div>
      </div>

      {pendingEmails.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground text-center max-w-md">
              No emails pending review. New emails will appear here when your
              sequences generate them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Email List */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pending Emails</CardTitle>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedIds.size === pendingEmails.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pendingEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      currentEmail?.id === email.id ? "bg-muted" : ""
                    }`}
                    onClick={() => selectEmail(email)}
                  >
                    <Checkbox
                      checked={selectedIds.has(email.id)}
                      onCheckedChange={(e) => {
                        e.stopPropagation?.()
                        toggleSelect(email.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(
                              `${email.contact.first_name} ${email.contact.last_name}`
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">
                          {email.contact.first_name} {email.contact.last_name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {email.contact.company?.name}
                      </p>
                      <p className="text-sm truncate mt-1">{email.subject}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Step {email.sequence.step_number}
                        </Badge>
                        <span
                          className={`text-xs ${
                            email.ai_confidence >= 90
                              ? "text-green-600"
                              : email.ai_confidence >= 80
                              ? "text-yellow-600"
                              : "text-orange-600"
                          }`}
                        >
                          {email.ai_confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Email Preview */}
          <Card className="md:col-span-2">
            {currentEmail ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPrev}
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentIndex + 1} of {pendingEmails.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNext}
                        disabled={currentIndex === pendingEmails.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentEmail.ai_confidence < 85 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Review recommended
                        </Badge>
                      )}
                      <Badge variant="outline">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {currentEmail.ai_confidence}% AI confidence
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recipient Info */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(
                          `${currentEmail.contact.first_name} ${currentEmail.contact.last_name}`
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {currentEmail.contact.first_name}{" "}
                        {currentEmail.contact.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {currentEmail.contact.email}
                      </p>
                      {currentEmail.contact.company && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {currentEmail.contact.company.name}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto">
                      <Badge variant="outline">
                        {currentEmail.sequence.name} • Step{" "}
                        {currentEmail.sequence.step_number}
                      </Badge>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Subject
                    </p>
                    <p className="font-medium">{currentEmail.subject}</p>
                  </div>

                  {/* Body */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Email Body
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {isEditing ? "Cancel Edit" : "Edit"}
                      </Button>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <Button size="sm" onClick={handleSaveEdit}>
                          Save Changes
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="whitespace-pre-wrap text-sm">
                          {editedBody}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => handleReject(currentEmail.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject & Remove
                    </Button>
                    <Button onClick={() => handleApprove(currentEmail.id)}>
                      <Send className="h-4 w-4 mr-2" />
                      Approve & Send
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select an email to preview</p>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
