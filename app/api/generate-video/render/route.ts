import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
    try {
        const { manifest, analysis, recordingId } = await request.json();

        // 1. Save Analysis
        const { data: analysisData, error: analysisError } = await supabase
            .from('loan_analyses')
            .insert([{ recording_id: recordingId || null, analysis_data: analysis }])
            .select('id')
            .single();

        if (analysisError) throw analysisError;
        const analysisId = analysisData.id;

        // 2. Save Manifest
        const { data: manifestData, error: manifestError } = await supabase
            .from('video_manifests')
            .insert([{ analysis_id: analysisId, manifest_data: manifest }])
            .select('id')
            .single();

        if (manifestError) throw manifestError;
        const manifestId = manifestData.id;

        // 3. Call External Video Generator Service
        // Ensure correct endpoint construction whether env var has trailing slash or not
        // Ensure correct endpoint construction: only append /generate-video if not already present
        const rawUrl = (process.env.NEXT_PUBLIC_VIDEO_GENERATOR_URL || 'http://localhost:3001').replace(/\/$/, '');
        const generatorUrl = rawUrl.endsWith('/generate-video') ? rawUrl : `${rawUrl}/generate-video`;

        console.log(`🚀 Calling video generator service: ${generatorUrl}`);
        const generatorResponse = await fetch(generatorUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manifest, analysis, manifest_id: manifestId }),
        });

        if (!generatorResponse.ok) {
            const errorText = await generatorResponse.text();
            throw new Error(`Video generator service failed: ${errorText}`);
        }

        const { videoUrl: initialVideoUrl, videoId, status } = await generatorResponse.json();

        // 4. Save Video Record (Initial status might be processing)
        const { error: videoError } = await supabase
            .from('videos')
            .upsert([{
                id: videoId,
                manifest_id: manifestId,
                video_url: initialVideoUrl || null,
                status: status || 'processing',
                storage_metadata: { external_id: videoId }
            }]);

        if (videoError) {
            console.error('⚠️ Failed to save video record:', videoError);
        }

        // 5. Create Consolidated Artifact Record
        const { error: artifactError } = await supabase
            .from('artifacts')
            .insert([{
                analysis_id: analysisId,
                short_id: analysisId.slice(0, 8).toUpperCase(),
                title: (analysis?.loanOverview?.borrowerName || analysis?.loanOverview?.borrowerLegalName || 'Untitled') + ' - ' + (analysis?.loanOverview?.loanType || 'Loan Briefing'),
                description: analysis?.loanOverview?.description || '',
                borrower: analysis?.loanOverview?.borrowerName || analysis?.loanOverview?.borrowerLegalName || 'N/A',
                amount: (analysis?.loanOverview?.amount || analysis?.loanOverview?.facilityAmount?.value || '0').toString(),
                decision: analysis?.recommendation?.decision || analysis?.creditRecommendation?.recommendation || 'unknown',
                video_url: initialVideoUrl || null,
                video_status: status || 'processing',
                metrics: {
                    ebitda: analysis?.financialHealth?.ebitdaMargin || (analysis?.financialAnalysis?.ebitda?.margin ? `${analysis.financialAnalysis.ebitda.margin}%` : "N/A"),
                    leverage: analysis?.financialHealth?.leverage || (analysis?.financialAnalysis?.leverage?.debtToEbitda ? `${analysis.financialAnalysis.leverage.debtToEbitda}x` : "N/A"),
                    dscr: analysis?.financialHealth?.interestCoverage || (analysis?.financialAnalysis?.interestCoverage ? `${analysis.financialAnalysis.interestCoverage}x` : "N/A")
                }
            }]);

        if (artifactError) {
            console.error('⚠️ Failed to create consolidated artifact:', artifactError);
        }

        return NextResponse.json({ videoUrl: initialVideoUrl, videoId, manifestId, status });
    } catch (error: any) {
        console.error('💥 Render initiation failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
