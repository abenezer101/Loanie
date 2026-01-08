"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Leaf,
  Users,
  Building2,
} from "lucide-react"
import type { LoanAnalysis, VideoScene as VideoSceneType, VisualComponent } from "@/lib/types"

interface VideoSceneProps {
  scene: VideoSceneType
  analysis: LoanAnalysis
}

export function VideoScene({ scene, analysis }: VideoSceneProps) {
  const renderComponent = (component: VisualComponent, index: number) => {
    switch (component.type) {
      case "title":
        return (
          <h2 key={index} className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
            {component.text}
          </h2>
        )

      case "key_value":
        return (
          <div key={index} className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
            {component.items?.map((item, i) => (
              <div key={i} className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-lg font-semibold text-foreground">{item.value}</p>
              </div>
            )) || <p className="col-span-2 text-xs text-muted-foreground text-center">No data available</p>}
          </div>
        )

      case "metric_card":
        const TrendIcon = component.trend === "up" ? TrendingUp : component.trend === "down" ? TrendingDown : Minus
        const trendColor =
          component.trend === "up"
            ? "text-green-400"
            : component.trend === "down"
              ? "text-red-400"
              : "text-muted-foreground"
        return (
          <div key={index} className="bg-secondary/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{component.label}</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold text-primary">{component.value}</p>
              <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            </div>
          </div>
        )

      case "bar_chart":
        return (
          <div key={index} className="w-full max-w-md mx-auto">
            <p className="text-sm text-muted-foreground mb-2 text-center">{component.title}</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={component.data || []}>
                  <XAxis dataKey="year" tick={{ fill: "#888", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Bar dataKey="value" fill="hsl(165, 50%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )

      case "risk_table":
        return (
          <div key={index} className="space-y-2 w-full max-w-md mx-auto">
            {component.risks?.slice(0, 3).map((risk, i) => (
              <div key={i} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                <AlertTriangle
                  className={`w-5 h-5 ${
                    risk.severity === "high"
                      ? "text-red-400"
                      : risk.severity === "medium"
                        ? "text-yellow-400"
                        : "text-green-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{risk.factor}</p>
                  <p className="text-xs text-muted-foreground truncate">{risk.mitigant}</p>
                </div>
              </div>
            )) || <p className="text-xs text-muted-foreground text-center">No risk data available</p>}
          </div>
        )

      case "covenant_list":
        return (
          <div key={index} className="space-y-2 w-full max-w-md mx-auto">
            {component.covenants?.slice(0, 4).map((covenant, i) => (
              <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {covenant.compliant ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-foreground">{covenant.type}</span>
                </div>
                <span className="text-xs text-muted-foreground">{covenant.status}</span>
              </div>
            )) || <p className="text-xs text-muted-foreground text-center">No covenant data available</p>}
          </div>
        )

      case "esg_scores":
        return (
          <div key={index} className="flex gap-4 justify-center">
            <div className="bg-secondary/50 rounded-lg p-4 text-center flex-1 max-w-[120px]">
              <Leaf className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <p className="text-xs text-muted-foreground">Environmental</p>
              <p className="text-xl font-bold text-foreground">{component.scores?.environmental || "N/A"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 text-center flex-1 max-w-[120px]">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-xs text-muted-foreground">Social</p>
              <p className="text-xl font-bold text-foreground">{component.scores?.social || "N/A"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 text-center flex-1 max-w-[120px]">
              <Building2 className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <p className="text-xs text-muted-foreground">Governance</p>
              <p className="text-xl font-bold text-foreground">{component.scores?.governance || "N/A"}</p>
            </div>
          </div>
        )

      case "recommendation":
        return (
          <div key={index} className="text-center w-full max-w-md mx-auto">
            <div
              className={`inline-flex items-center px-6 py-2 rounded-full text-lg font-bold mb-4 ${
                component.decision.toLowerCase() === "approve"
                  ? "bg-green-500/20 text-green-400"
                  : component.decision.toLowerCase() === "conditional"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
              }`}
            >
              {component.decision.toUpperCase()}
            </div>
            <p className="text-sm text-muted-foreground">{component.rationale}</p>
          </div>
        )

      case "confidence_indicator":
        return (
          <div key={index} className="flex flex-col items-center gap-2 bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-white/10 w-full max-w-sm mx-auto">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                component.confidence === "HIGH" ? "bg-green-500" : 
                component.confidence === "MEDIUM" ? "bg-yellow-500" : "bg-red-500"
              }`} />
              <span className="text-xs font-bold tracking-tighter uppercase text-white/70">
                Confidence: {component.confidence}
              </span>
            </div>
            <div className="text-center">
              <p className={`text-sm font-bold ${
                component.status === "COMPLETE" ? "text-green-400" : "text-red-400"
              }`}>
                {component.status.replace("_", " ")}
              </p>
              {component.source && (
                <p className="text-[10px] text-white/40 mt-1 italic">Source: {component.source}</p>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-background to-card">
      {/* Scene Content */}
      <div className="flex flex-col items-center justify-center gap-6 flex-1 w-full">
        {scene?.visuals?.components?.map((component, index) => renderComponent(component, index))}
      </div>

      {/* Narration Text */}
      <div className="mt-auto pt-4 border-t border-border w-full">
        <p className="text-sm text-muted-foreground text-center italic leading-relaxed">"{scene?.narration?.text || ""}"</p>
      </div>
    </div>
  )
}
