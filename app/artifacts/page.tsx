"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Download, Play, FileText, BarChart3, ShieldCheck, FileVideo, Trash2, Loader2 } from "lucide-react"

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchArtifacts = async () => {
    try {
      const response = await fetch("/api/artifacts")
      if (response.ok) {
        const data = await response.json()
        setArtifacts(data)
      }
    } catch (error) {
      console.error("Failed to fetch artifacts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArtifacts()
    
    // Poll for updates if any artifact is processing
    const interval = setInterval(() => {
      const hasProcessing = artifacts.some(a => a.videoStatus === 'processing');
      if (hasProcessing || artifacts.length === 0) {
        fetchArtifacts();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [artifacts.length]) // Only re-run if count changes, otherwise internal check handles it

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log("🗑️ Attempting to delete artifact with ID:", id)
    
    if (!confirm("Are you sure you want to delete this artifact? This will also remove the associated video.")) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: "DELETE"
      })
      
      console.log("📡 Delete response status:", response.status)
      
      if (response.ok) {
        console.log("✅ Successfully deleted from DB")
        setArtifacts(prev => prev.filter(a => a.dbId !== id))
      } else {
        const errorData = await response.json()
        console.error("❌ Delete failed:", errorData)
        alert(`Failed to delete: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error("💥 Delete error:", error)
      alert("An error occurred while deleting")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-[1800px] flex flex-col gap-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading artifacts...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-[1800px] flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Artifacts</h1>
        <p className="text-sm text-muted-foreground">Historical records of all AI-generated loan briefings and data analysis.</p>
      </div>

      {artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-card border border-border rounded-xl">
          <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
          <h2 className="text-xl font-semibold mb-1">No artifacts found</h2>
          <p className="text-muted-foreground max-w-sm">
            Once you generate loan briefing videos, they will appear here for you to download and review.
          </p>
          <Button asChild className="mt-6">
            <Link href="/generate-video">Generate First Briefing</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1400px]">
          {artifacts.map((artifact) => (
            <Card key={artifact.dbId} className="bg-card border-border shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-100" />
              <CardHeader className="pb-3 p-4">
                <div className="flex items-start justify-between text-left">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                        {artifact.id}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> {artifact.date}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-tight truncate w-full block">
                      {artifact.title}
                    </h3>
                  </div>
                  <Badge variant={artifact.decision === "approve" ? "default" : "secondary"} className="text-[10px] px-1.5 h-5 capitalize ml-2 shrink-0">
                    {artifact.decision}
                  </Badge>
                </div>
                <CardDescription className="text-xs line-clamp-2 mt-1.5">
                  {artifact.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                {/* Video Preview / Inline Player */}
                <div 
                  className="aspect-video bg-background rounded-lg border border-border overflow-hidden relative group/video cursor-pointer"
                >
                  {artifact.videoUrl ? (
                    <video 
                      src={artifact.videoUrl} 
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    <div className="absolute inset-0 bg-secondary/30 flex flex-col items-center justify-center p-6 text-center">
                        {artifact.videoStatus && artifact.videoStatus !== 'completed' && artifact.videoStatus !== 'failed' ? (
                            <div className="space-y-3">
                                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                                <p className="text-[10px] font-medium text-muted-foreground animate-pulse">
                                    {artifact.videoStatus.includes('(') ? artifact.videoStatus : 'Generating loan briefing...'}
                                </p>
                            </div>
                        ) : artifact.videoStatus === 'failed' ? (
                            <div className="space-y-2">
                                <FileVideo className="w-8 h-8 text-destructive mx-auto opacity-50" />
                                <p className="text-[10px] font-semibold text-destructive">Generation Failed</p>
                            </div>
                        ) : (
                            <FileVideo className="w-8 h-8 text-muted-foreground/50" />
                        )}
                    </div>
                  )}
                  
                  {!artifact.videoUrl && artifact.videoStatus !== 'processing' && artifact.videoStatus !== 'failed' && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3">
                        <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg group-hover/video:scale-110 transition-transform cursor-pointer">
                            <Play className="w-4 h-4 ml-0.5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-white">Preview Briefing</p>
                            <p className="text-[10px] text-white/70">{artifact.videoStatus || 'Visual summary'}</p>
                        </div>
                        </div>
                    </div>
                  )}
                </div>

                {/* Data Snapshot */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/50">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Amount</p>
                    <p className="text-xs font-semibold text-foreground">{artifact.amount}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Borrower</p>
                    <p className="text-xs font-semibold text-foreground truncate">{artifact.borrower}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Video Status</p>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        artifact.videoStatus === 'completed' ? 'bg-green-500' : 
                        artifact.videoStatus === 'failed' ? 'bg-destructive' : 
                        'bg-amber-500 animate-pulse'
                      }`} />
                      <span className="text-xs font-semibold text-foreground truncate capitalize">
                        {artifact.videoStatus || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 px-1">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-muted-foreground uppercase font-bold">EBITDA</span>
                    <span className="text-[10px] font-semibold">{artifact.metrics?.ebitda || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col border-x border-border/50 px-2">
                    <span className="text-[8px] text-muted-foreground uppercase font-bold">Leverage</span>
                    <span className="text-[10px] font-semibold">{artifact.metrics?.leverage || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-muted-foreground uppercase font-bold">DSCR</span>
                    <span className="text-[10px] font-semibold">{artifact.metrics?.dscr || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    disabled={deletingId === artifact.dbId}
                    onClick={(e) => handleDelete(artifact.dbId, e)}
                  >
                    {deletingId === artifact.dbId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>

                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-7 text-[10px] px-3 transition-all active:scale-95"
                    disabled={!artifact.videoUrl}
                    onClick={async () => {
                        if (artifact.videoUrl) {
                            try {
                                const response = await fetch(artifact.videoUrl);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${artifact.title.replace(/\s+/g, '_')}.mp4`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            } catch (err) {
                                console.error("Download failed:", err);
                                window.open(artifact.videoUrl, '_blank');
                            }
                        }
                    }}
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    Download Video
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}

