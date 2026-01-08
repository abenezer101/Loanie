import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('videos')
            .select('status, video_url')
            .eq('id', id)
            .single();

        if (error) throw error;

        return NextResponse.json({
            status: data.status,
            videoUrl: data.video_url
        });
    } catch (error: any) {
        console.error('Error fetching video status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
