import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('artifacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform slightly to match exact FE types if needed
        const artifacts = data.map((art: any) => ({
            id: art.short_id,
            dbId: art.id,
            title: art.title,
            description: art.description,
            date: new Date(art.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            amount: (art.amount && art.amount !== '0')
                ? (art.amount.includes('$') ? art.amount : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(art.amount)))
                : "N/A",
            decision: art.decision?.toLowerCase() || "unknown",
            borrower: art.borrower,
            videoUrl: art.video_url,
            videoStatus: art.video_status,
            metrics: art.metrics
        }));

        return NextResponse.json(artifacts);
    } catch (error: any) {
        console.error('Failed to fetch artifacts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
