export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          domain: string | null
          icp_config: Json | null
          sending_config: Json | null
          subscription_tier: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          enrichment_credits_remaining: number
          ai_credits_remaining: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          icp_config?: Json | null
          sending_config?: Json | null
          subscription_tier?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          enrichment_credits_remaining?: number
          ai_credits_remaining?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          icp_config?: Json | null
          sending_config?: Json | null
          subscription_tier?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          enrichment_credits_remaining?: number
          ai_credits_remaining?: number
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          workspace_id: string
          name: string
          domain: string | null
          industry: string | null
          employee_count: number | null
          funding_stage: string | null
          funding_total: number | null
          tech_stack: string[] | null
          location: string | null
          description: string | null
          linkedin_url: string | null
          apollo_id: string | null
          enrichment_data: Json | null
          fit_score: number | null
          intent_score: number | null
          combined_score: number | null
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          domain?: string | null
          industry?: string | null
          employee_count?: number | null
          funding_stage?: string | null
          funding_total?: number | null
          tech_stack?: string[] | null
          location?: string | null
          description?: string | null
          linkedin_url?: string | null
          apollo_id?: string | null
          enrichment_data?: Json | null
          fit_score?: number | null
          intent_score?: number | null
          combined_score?: number | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          domain?: string | null
          industry?: string | null
          employee_count?: number | null
          funding_stage?: string | null
          funding_total?: number | null
          tech_stack?: string[] | null
          location?: string | null
          description?: string | null
          linkedin_url?: string | null
          apollo_id?: string | null
          enrichment_data?: Json | null
          fit_score?: number | null
          intent_score?: number | null
          combined_score?: number | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          workspace_id: string
          company_id: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
          email_verified: boolean
          title: string | null
          role_type: string | null
          phone: string | null
          linkedin_url: string | null
          apollo_id: string | null
          signals: Json | null
          contact_priority: number | null
          enrichment_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          company_id?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          email_verified?: boolean
          title?: string | null
          role_type?: string | null
          phone?: string | null
          linkedin_url?: string | null
          apollo_id?: string | null
          signals?: Json | null
          contact_priority?: number | null
          enrichment_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          company_id?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          email_verified?: boolean
          title?: string | null
          role_type?: string | null
          phone?: string | null
          linkedin_url?: string | null
          apollo_id?: string | null
          signals?: Json | null
          contact_priority?: number | null
          enrichment_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          workspace_id: string
          company_id: string | null
          contact_id: string | null
          title: string
          stage: string
          value: number | null
          probability: number | null
          close_date: string | null
          notes: string | null
          ai_next_action: string | null
          ai_risk_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          company_id?: string | null
          contact_id?: string | null
          title: string
          stage?: string
          value?: number | null
          probability?: number | null
          close_date?: string | null
          notes?: string | null
          ai_next_action?: string | null
          ai_risk_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          company_id?: string | null
          contact_id?: string | null
          title?: string
          stage?: string
          value?: number | null
          probability?: number | null
          close_date?: string | null
          notes?: string | null
          ai_next_action?: string | null
          ai_risk_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      interactions: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string | null
          deal_id: string | null
          type: string
          subject: string | null
          content: string | null
          metadata: Json | null
          sentiment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id?: string | null
          deal_id?: string | null
          type: string
          subject?: string | null
          content?: string | null
          metadata?: Json | null
          sentiment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string | null
          deal_id?: string | null
          type?: string
          subject?: string | null
          content?: string | null
          metadata?: Json | null
          sentiment?: string | null
          created_at?: string
        }
      }
      sequences: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          status: string
          steps: Json
          settings: Json | null
          stats: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          status?: string
          steps: Json
          settings?: Json | null
          stats?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          status?: string
          steps?: Json
          settings?: Json | null
          stats?: Json
          created_at?: string
          updated_at?: string
        }
      }
      sequence_enrollments: {
        Row: {
          id: string
          sequence_id: string
          contact_id: string
          status: string
          current_step: number
          next_send_at: string | null
          ab_variant: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sequence_id: string
          contact_id: string
          status?: string
          current_step?: number
          next_send_at?: string | null
          ab_variant?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sequence_id?: string
          contact_id?: string
          status?: string
          current_step?: number
          next_send_at?: string | null
          ab_variant?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sent_emails: {
        Row: {
          id: string
          workspace_id: string
          enrollment_id: string | null
          contact_id: string | null
          message_id: string | null
          thread_id: string | null
          subject: string | null
          body_html: string | null
          body_text: string | null
          status: string
          opened_at: string | null
          clicked_at: string | null
          replied_at: string | null
          bounced_at: string | null
          bounce_reason: string | null
          spam_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          enrollment_id?: string | null
          contact_id?: string | null
          message_id?: string | null
          thread_id?: string | null
          subject?: string | null
          body_html?: string | null
          body_text?: string | null
          status?: string
          opened_at?: string | null
          clicked_at?: string | null
          replied_at?: string | null
          bounced_at?: string | null
          bounce_reason?: string | null
          spam_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          enrollment_id?: string | null
          contact_id?: string | null
          message_id?: string | null
          thread_id?: string | null
          subject?: string | null
          body_html?: string | null
          body_text?: string | null
          status?: string
          opened_at?: string | null
          clicked_at?: string | null
          replied_at?: string | null
          bounced_at?: string | null
          bounce_reason?: string | null
          spam_score?: number | null
          created_at?: string
        }
      }
      email_accounts: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          provider: string
          email: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          daily_send_limit: number
          sends_today: number
          warmup_stage: string
          dkim_verified: boolean
          spf_verified: boolean
          dmarc_verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          provider: string
          email: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          daily_send_limit?: number
          sends_today?: number
          warmup_stage?: string
          dkim_verified?: boolean
          spf_verified?: boolean
          dmarc_verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          provider?: string
          email?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          daily_send_limit?: number
          sends_today?: number
          warmup_stage?: string
          dkim_verified?: boolean
          spf_verified?: boolean
          dmarc_verified?: boolean
          created_at?: string
        }
      }
      suppressions: {
        Row: {
          id: string
          workspace_id: string
          email: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          reason?: string | null
          created_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          workspace_id: string
          deal_id: string | null
          contact_id: string | null
          title: string | null
          start_time: string | null
          end_time: string | null
          recording_url: string | null
          transcript: string | null
          ai_summary: string | null
          action_items: Json | null
          sentiment_analysis: Json | null
          suggested_stage: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          deal_id?: string | null
          contact_id?: string | null
          title?: string | null
          start_time?: string | null
          end_time?: string | null
          recording_url?: string | null
          transcript?: string | null
          ai_summary?: string | null
          action_items?: Json | null
          sentiment_analysis?: Json | null
          suggested_stage?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          deal_id?: string | null
          contact_id?: string | null
          title?: string | null
          start_time?: string | null
          end_time?: string | null
          recording_url?: string | null
          transcript?: string | null
          ai_summary?: string | null
          action_items?: Json | null
          sentiment_analysis?: Json | null
          suggested_stage?: string | null
          created_at?: string
        }
      }
      icp_presets: {
        Row: {
          id: string
          workspace_id: string
          name: string
          filters: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          filters: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          filters?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_companies: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
          p_workspace_id: string
        }
        Returns: {
          id: string
          name: string
          domain: string | null
          industry: string | null
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update']

export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']
export type WorkspaceMemberInsert = Database['public']['Tables']['workspace_members']['Insert']

export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export type Contact = Database['public']['Tables']['contacts']['Row']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']

export type Deal = Database['public']['Tables']['deals']['Row']
export type DealInsert = Database['public']['Tables']['deals']['Insert']
export type DealUpdate = Database['public']['Tables']['deals']['Update']

export type Interaction = Database['public']['Tables']['interactions']['Row']
export type InteractionInsert = Database['public']['Tables']['interactions']['Insert']

export type Sequence = Database['public']['Tables']['sequences']['Row']
export type SequenceInsert = Database['public']['Tables']['sequences']['Insert']
export type SequenceUpdate = Database['public']['Tables']['sequences']['Update']

export type SequenceEnrollment = Database['public']['Tables']['sequence_enrollments']['Row']
export type SequenceEnrollmentInsert = Database['public']['Tables']['sequence_enrollments']['Insert']
export type SequenceEnrollmentUpdate = Database['public']['Tables']['sequence_enrollments']['Update']

export type SentEmail = Database['public']['Tables']['sent_emails']['Row']
export type SentEmailInsert = Database['public']['Tables']['sent_emails']['Insert']
export type SentEmailUpdate = Database['public']['Tables']['sent_emails']['Update']

export type EmailAccount = Database['public']['Tables']['email_accounts']['Row']
export type EmailAccountInsert = Database['public']['Tables']['email_accounts']['Insert']
export type EmailAccountUpdate = Database['public']['Tables']['email_accounts']['Update']

export type Suppression = Database['public']['Tables']['suppressions']['Row']
export type SuppressionInsert = Database['public']['Tables']['suppressions']['Insert']

export type Meeting = Database['public']['Tables']['meetings']['Row']
export type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
export type MeetingUpdate = Database['public']['Tables']['meetings']['Update']

export type IcpPreset = Database['public']['Tables']['icp_presets']['Row']
export type IcpPresetInsert = Database['public']['Tables']['icp_presets']['Insert']

// Sequence step structure
export interface SequenceStep {
  step_number: number
  delay_days: number
  subject_template: string
  body_template: string
  variant?: 'A' | 'B'
}

// ICP config structure
export interface IcpConfig {
  targetIndustries: string[]
  minEmployees: number
  maxEmployees: number
  targetFundingStages: string[]
  targetTechStack: string[]
  targetLocations: string[]
  keywords: string[]
}

// Contact with company
export interface ContactWithCompany extends Contact {
  company: Company | null
}

// Deal with company and contact
export interface DealWithRelations extends Deal {
  company: Company | null
  contact: Contact | null
}

// Interaction with contact
export interface InteractionWithContact extends Interaction {
  contact: Contact | null
}
