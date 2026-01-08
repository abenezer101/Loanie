"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LoanAnalysis } from "@/lib/types"

interface AnalysisPanelProps {
  analysis: LoanAnalysis
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["overview"])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  const SectionHeader = ({ id, title }: { id: string; title: string }) => (
    <button onClick={() => toggleSection(id)} className="flex items-center justify-between w-full py-2 text-left">
      <span className="text-base font-semibold text-foreground">{title}</span>
      {expandedSections.includes(id) ? (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  )

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-400"
      case "medium":
        return "text-yellow-400"
      case "low":
        return "text-green-400"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <Card className="bg-card border-border shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-foreground">Loan Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metadata & Confidence Integration */}
        {analysis.metadata && (
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
            <div className={`shrink-0 w-3 h-3 rounded-full ${
              analysis.metadata.confidence === "HIGH" ? "bg-green-500" : 
              analysis.metadata.confidence === "MEDIUM" ? "bg-yellow-500" : "bg-red-500"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-tight text-foreground uppercase">
                  Confidence: {analysis.metadata.confidence}
                </p>
                {analysis.metadata.analystOverride && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase transition-all animate-pulse">
                    Analyst Override
                  </span>
                )}
              </div>
              <p className={`text-[10px] font-medium leading-tight mt-0.5 ${
                analysis.metadata.status === "COMPLETE" ? "text-green-400" : "text-red-400"
              }`}>
                {analysis.metadata.status.replace("_", " ")}
              </p>
            </div>
          </div>
        )}

        {/* Loan Overview */}
        <div className="border-b border-border pb-2">
          <SectionHeader id="overview" title="Loan Overview" />
          {expandedSections.includes("overview") && (
            <div className="pl-4 space-y-2 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Borrower:</span>
                  <p className="font-medium text-foreground">
                    {(analysis as any)?.loanOverview?.borrowerName || (analysis as any)?.loanOverview?.borrowerLegalName || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Loan Type:</span>
                  <p className="font-medium text-foreground">{(analysis as any)?.loanOverview?.loanType || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium text-primary">
                    {(analysis as any)?.loanOverview?.amount || (analysis as any)?.loanOverview?.facilityAmount?.value || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tenor:</span>
                  <p className="font-medium text-foreground">{(analysis as any)?.loanOverview?.tenor || "N/A"}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Purpose:</span>
                <p className="text-base text-foreground font-medium">
                  {(analysis as any)?.loanOverview?.purpose || (analysis as any)?.loanOverview?.purposeOfFunds || "N/A"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Financial Health */}
        <div className="border-b border-border pb-2">
          <SectionHeader id="financial" title="Financial Health" />
          {expandedSections.includes("financial") && (
            <div className="pl-4 space-y-3 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 rounded bg-secondary/50">
                  <span className="text-xs text-muted-foreground">EBITDA Margin</span>
                  <p className="text-lg font-semibold text-primary">
                    {(analysis as any)?.financialHealth?.ebitdaMargin || (analysis as any)?.financialAnalysis?.ebitda?.margin || "N/A"}
                  </p>
                </div>
                <div className="p-2 rounded bg-secondary/50">
                  <span className="text-xs text-muted-foreground">Leverage</span>
                  <p className="text-lg font-semibold text-foreground">
                    {(analysis as any)?.financialHealth?.leverage || (analysis as any)?.financialAnalysis?.leverage?.debtToEbitda || "N/A"}
                  </p>
                </div>
                <div className="p-2 rounded bg-secondary/50">
                  <span className="text-xs text-muted-foreground">Interest Coverage</span>
                  <p className="text-lg font-semibold text-foreground">
                    {(analysis as any)?.financialHealth?.interestCoverage || (analysis as any)?.financialAnalysis?.interestCoverage || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risk Factors */}
        <div className="border-b border-border pb-2">
          <SectionHeader id="risks" title="Risk Factors" />
          {expandedSections.includes("risks") && (
            <div className="pl-4 space-y-2 mt-2">
              {analysis?.riskFactors && analysis.riskFactors.length > 0 ? (
                analysis.riskFactors.map((risk, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${getSeverityColor(risk.severity)}`} />
                    <div>
                      <p className="font-medium text-foreground">{risk.factor}</p>
                      <p className="text-xs text-muted-foreground">Mitigant: {risk.mitigant}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No risk factors identified</p>
              )}
            </div>
          )}
        </div>

        {/* Covenants */}
        <div className="border-b border-border pb-2">
          <SectionHeader id="covenants" title="Covenants" />
          {expandedSections.includes("covenants") && (
            <div className="pl-4 space-y-2 mt-2">
              {analysis?.covenants && analysis.covenants.length > 0 ? (
                analysis.covenants.map((covenant, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {covenant.compliant ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-foreground">{covenant.type}</span>
                    </div>
                    <span className="text-muted-foreground">{covenant.requirement || (covenant as any).status}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No covenants identified</p>
              )}
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div>
          <SectionHeader id="recommendation" title="Recommendation" />
          {expandedSections.includes("recommendation") && (
            <div className="pl-4 mt-2">
              {analysis?.recommendation?.decision ? (
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    analysis.recommendation.decision === "approve"
                      ? "bg-green-500/20 text-green-400"
                      : analysis.recommendation.decision === "conditional"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {analysis.recommendation.decision.toUpperCase()}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Pending Decision</span>
              )}
              <p className="text-sm text-muted-foreground mt-2">{analysis?.recommendation?.rationale || "Rationale not provided."}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
