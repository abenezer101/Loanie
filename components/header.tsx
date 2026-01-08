import { FileVideo, Sparkles } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
              <FileVideo className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">Loanie</h1>
              <p className="text-xs text-muted-foreground">AI Loan Intelligence Platform</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
