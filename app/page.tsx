import Link from "next/link"
import { Mic, Video, FileVideo, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Select an action to get started with your loan intelligence.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        {/* Record & Analyze Card */}
        <Link href="/record-meeting" className="block group">
          <Card className="bg-card border-border h-full transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 group-hover:scale-[1.01] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-all duration-300 group-hover:rotate-3">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl text-foreground">Record Meeting</CardTitle>
              <CardDescription className="text-muted-foreground text-base mt-2">
                Conduct a client meeting and capture every detail with AI transcription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Real-time voice capture</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Deepgram high-accuracy transcription</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Automatic summary generation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Generate Video Card */}
        <Link href="/generate-video" className="block group">
          <Card className="bg-card border-border h-full transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 group-hover:scale-[1.01] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-all duration-300 group-hover:-rotate-3">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl text-foreground">Generate Video</CardTitle>
              <CardDescription className="text-muted-foreground text-base mt-2">
                Turn your meetings and documents into professional briefing videos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Combine transcripts and data</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>AI-driven risk analysis</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Ready-to-present video manifest</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
