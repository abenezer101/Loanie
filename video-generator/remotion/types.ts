export interface LoanAnalysis {
    metadata?: {
        status: "COMPLETE" | "INSUFFICIENT_DATA"
        confidence: "LOW" | "MEDIUM" | "HIGH"
        analystOverride?: boolean
    }
    loanOverview: {
        borrowerName: string
        loanType: string
        amount: string
        tenor: string
        purpose: string
        description: string
    }
    borrowerSnapshot: {
        industry: string
        yearsInBusiness: number
        employees: number
        headquarters: string
        creditRating: string
    }
    financialHealth: {
        revenue: string
        ebitda: string
        ebitdaMargin: string
        leverage: string
        interestCoverage: string
        revenueGrowth: string
        profitTrend: Array<{ year: string; value: number }>
    }
    riskFactors: Array<{
        factor: string
        severity: "low" | "medium" | "high"
        mitigant: string
    }>
    covenants: Array<{
        type: string
        requirement: string
        currentStatus: string
        compliant: boolean
    }>
    esgIndicators: {
        environmental: { score: string; notes: string }
        social: { score: string; notes: string }
        governance: { score: string; notes: string }
    }
    recommendation: {
        decision: "approve" | "conditional" | "decline"
        rationale: string
        conditions?: string[]
    }
}

export interface VideoManifest {
    meta: {
        loan_id: string
        version: string
        theme: string
        resolution: string
        fps: number
    }
    scenes: VideoScene[]
}

export interface VideoScene {
    id: string
    start: number
    duration: number
    narration: {
        text: string
        audioUrl?: string
    }
    visuals: {
        layout: string
        components: VisualComponent[]
    }
}

export type VisualComponent =
    | { type: "title"; text: string }
    | { type: "subtitle"; text: string }
    | { type: "data_card"; title: string; value: string; icon?: string }
    | { type: "key_value"; items: Array<{ label: string; value: string }> }
    | { type: "metric_card"; label: string; value: string; trend: string }
    | { type: "bar_chart"; title: string; data: Array<{ year: string; value: number }> }
    | { type: "risk_table"; risks: Array<{ factor: string; severity: string; mitigant: string }> }
    | {
        type: "covenant_list"
        covenants: Array<{ type: string; requirement: string; status: string; compliant: boolean }>
    }
    | { type: "esg_scores"; scores: { environmental: string; social: string; governance: string } }
    | { type: "recommendation"; decision: string; rationale: string | string[]; conditions?: string[] }
    | { type: "confidence_indicator"; status: string; confidence: string; source?: string }

