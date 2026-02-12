import Link from "next/link"
import { Sparkles } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl">OutboundAI</span>
          </Link>
          {children}
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-lg">
          <blockquote className="text-xl font-medium mb-6">
            &quot;OutboundAI transformed our sales process. We went from 0 to $500K ARR
            in just 6 months with a team of 2.&quot;
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20" />
            <div>
              <p className="font-semibold">Michael Park</p>
              <p className="text-sm text-muted-foreground">Founder, Startup.io</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
