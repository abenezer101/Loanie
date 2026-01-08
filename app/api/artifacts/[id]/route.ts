import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log(`[DELETE] Request for artifact ID: ${id}`);

        // 1. Get artifact metadata first to clean up storage
        const { data: artifact, error: fetchError } = await supabase
            .from('artifacts')
            .select('video_url, analysis_id')
            .eq('id', id)
            .single();

        if (fetchError || !artifact) {
            console.error('[DELETE] Failed to find artifact for cleanup:', fetchError);
        } else if (artifact.video_url) {
            // 2. Delete video from Supabase Storage
            try {
                const url = new URL(artifact.video_url);
                const pathParts = url.pathname.split('/');
                const fileName = pathParts[pathParts.length - 1];

                console.log(`[DELETE] Cleaning up storage file: ${fileName}`);
                const { error: storageError } = await supabase.storage
                    .from('videos')
                    .remove([fileName]);

                if (storageError) console.error('[DELETE] Storage cleanup error:', storageError);
            } catch (urlErr) {
                console.error('[DELETE] Could not parse video URL for cleanup:', urlErr);
            }
        }

        // 3. Delete from DB
        const { data, error } = await supabase
            .from('artifacts')
            .delete()
            .eq('id', id)
            .select();

        console.log(`[DELETE] Supabase response:`, { data, error });

        if (error) throw error;

        // 4. Cleanup related records
        if (artifact?.analysis_id) {
            // Delete manifest first to respect potential foreign keys
            await supabase.from('video_manifests').delete().eq('analysis_id', artifact.analysis_id);
            await supabase.from('loan_analyses').delete().eq('id', artifact.analysis_id);
        }

        // 5. Cleanup video record 
        if (artifact?.video_url) {
            try {
                const url = new URL(artifact.video_url);
                const fileName = url.pathname.split('/').pop() || '';
                const videoId = fileName.split('.')[0];
                if (videoId && videoId.length > 20) { // Basic UUID check
                    await supabase.from('videos').delete().eq('id', videoId);
                }
            } catch (e) { }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete artifact:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
