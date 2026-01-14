import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id') || searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    try {
        // Check video generator service first (fastest, most accurate)
        const generatorUrl = (process.env.NEXT_PUBLIC_VIDEO_GENERATOR_URL || 'http://localhost:3001')
            .replace(/\/$/, '')
            .replace(/\/generate-video$/, '');

        const statusUrl = `${generatorUrl}/status/${videoId}`;

        console.log(`🔍 Checking video status: ${videoId}`);

        try {
            const response = await fetch(statusUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store'
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Status from generator:`, data);
                return NextResponse.json(data);
            }
        } catch (fetchError) {
            console.warn(`⚠️ Generator service unavailable, falling back to database`);
        }

        // Fallback to Supabase database
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
            .from('videos')
            .select('status, video_url, progress, progress_label')
            .eq('id', videoId)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        const response = {
            status: data.status,
            videoUrl: data.video_url,
            progress: data.progress || 0,
            progressLabel: data.progress_label || ''
        };

        console.log(`📊 Status from database:`, response);
        return NextResponse.json(response);

    } catch (error: any) {
        console.error('💥 Status check failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
