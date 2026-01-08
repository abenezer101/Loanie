import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Fetch the latest manifest and its associated analysis
        const { data: manifest, error: manifestError } = await supabase
            .from('video_manifests')
            .select('manifest_data, analysis_id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (manifestError) throw manifestError;

        const { data: analysis, error: analysisError } = await supabase
            .from('loan_analyses')
            .select('analysis_data, recording_id')
            .eq('id', manifest.analysis_id)
            .single();

        if (analysisError) throw analysisError;

        return NextResponse.json({
            manifest: manifest.manifest_data,
            analysis: analysis.analysis_data,
            recordingId: analysis.recording_id
        });
    } catch (error: any) {
        console.error('Failed to fetch last manifest:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
