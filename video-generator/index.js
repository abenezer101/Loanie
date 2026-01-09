const express = require('express');
const cors = require('cors');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { createClient: createDeepgramClient } = require('@deepgram/sdk');
const { pipeline } = require('stream/promises');
require('dotenv').config();

const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_KEY;
const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check Endpoint
app.get('/', (req, res) => {
    res.send('Video Generator Service is running');
});

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const PORT = process.env.PORT || 3001;
console.log(`📡 Cloud Run Port Detected: ${process.env.PORT}`);
console.log(`🚀 Starting on Port: ${PORT}`);

// Ensure output directories exist
const outputDir = path.join(__dirname, 'public', 'videos');
const audioDir = path.join(__dirname, 'public', 'audio');

[outputDir, audioDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Transform AI manifest format to Remotion expected format
function transformManifest(aiManifest) {
    if (!aiManifest) return null;

    const scenes = aiManifest.scenes || [];

    return {
        meta: aiManifest.meta || {
            loan_id: 'unknown',
            version: '1.0',
            theme: 'institutional-dark',
            resolution: '1920x1080',
            fps: 30
        },
        scenes: scenes.map((scene, idx) => {
            const rawComponents = scene.components || scene.visuals?.components || [];

            const transformedComponents = rawComponents.map(component => {
                // Ensure rationale is a string
                if (component.type === 'recommendation' && Array.isArray(component.rationale)) {
                    return { ...component, rationale: component.rationale.join('. ') };
                }
                return component;
            });

            return {
                id: scene.id || `scene_${idx}`,
                start: scene.start || scene.start_time || 0,
                duration: scene.duration || 10,
                narration: {
                    text: typeof scene.narration === 'string'
                        ? scene.narration
                        : scene.narration?.text || '',
                    audioUrl: typeof scene.narration === 'object' ? scene.narration.audioUrl : null
                },
                visuals: {
                    layout: scene.visuals?.layout || 'centered',
                    components: transformedComponents
                }
            };
        })
    };
}

app.post('/generate-video', async (req, res) => {
    const { manifest, analysis, manifest_id } = req.body;

    if (!manifest) {
        return res.status(400).json({ error: 'Missing manifest' });
    }

    const transformedManifest = transformManifest(manifest);
    if (!transformedManifest || transformedManifest.scenes.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty manifest' });
    }

    const videoId = crypto.randomUUID();
    const outputLocation = path.join(outputDir, `${videoId}.mp4`);

    console.log(`🎬 [${videoId}] Render requested for manifest_id: ${manifest_id}`);

    // Start render and wait for it to finish (required for Cloud Run to keep CPU active)
    let audioFiles = [];
    let supabaseAudioPaths = [];
    const BUCKET_NAME = 'narration-audio';

    try {
        console.log(`🎬 [${videoId}] Render starting...`);

        // Ensure bucket exists (best effort, requires service role key privileges)
        try {
            const { data: buckets } = await supabase.storage.listBuckets();
            if (!buckets?.find(b => b.name === BUCKET_NAME)) {
                await supabase.storage.createBucket(BUCKET_NAME, { public: true });
                console.log(`📦 Created Supabase bucket: ${BUCKET_NAME}`);
            }
        } catch (err) {
            console.log(`⚠️ Bucket check/creation skipped: ${err.message}`);
        }

        const fps = transformedManifest.meta.fps || 30;
        const totalDurationInSeconds = transformedManifest.scenes.reduce((acc, s) => acc + s.duration, 0);
        const durationInFrames = Math.max(1, Math.floor(totalDurationInSeconds * fps));

        console.log(`🎬 [${videoId}] Planning render: ${durationInFrames} frames (${totalDurationInSeconds}s) at ${fps}fps`);

        // Update status in DB
        if (manifest_id) {
            await supabase
                .from('videos')
                .upsert([{
                    id: videoId,
                    manifest_id: manifest_id,
                    status: 'processing',
                    progress: 5,
                    progress_label: 'Bundling project'
                }]);
        }

        const inputPath = path.resolve(__dirname, 'remotion', 'index.tsx');
        const bundled = await bundle(inputPath);

        // Step: Generate Narration Audio for each scene if missing
        console.log(`🔊 [${videoId}] Generating narration audio and uploading to Supabase...`);

        const totalScenes = transformedManifest.scenes.length;
        for (let i = 0; i < totalScenes; i++) {
            const scene = transformedManifest.scenes[i];

            // Update progress for audio generation (5-30% range)
            const audioProgress = Math.round((i / totalScenes) * 25) + 5;
            await supabase
                .from('videos')
                .update({
                    progress: audioProgress,
                    progress_label: `Generating Audio (${i + 1}/${totalScenes})`
                })
                .eq('id', videoId);
            if (scene.narration && scene.narration.text && !scene.narration.audioUrl) {
                try {
                    console.log(`  - Generating audio for scene ${i}: "${scene.narration.text.substring(0, 30)}..."`);
                    const audioFileName = `${videoId}_scene_${i}.mp3`;
                    const audioPath = path.join(audioDir, audioFileName);

                    const response = await deepgram.speak.request(
                        { text: scene.narration.text },
                        { model: 'aura-2-odysseus-en' }
                    );

                    const stream = await response.getStream();
                    if (stream) {
                        const file = fs.createWriteStream(audioPath);
                        await pipeline(stream, file);

                        // Upload to Supabase Storage
                        const audioBuffer = fs.readFileSync(audioPath);
                        const { error: uploadError } = await supabase.storage
                            .from(BUCKET_NAME)
                            .upload(audioFileName, audioBuffer, {
                                contentType: 'audio/mpeg',
                                upsert: true
                            });

                        if (uploadError) throw uploadError;

                        // Get public URL
                        const { data: urlData } = supabase.storage
                            .from(BUCKET_NAME)
                            .getPublicUrl(audioFileName);

                        scene.narration.audioUrl = urlData.publicUrl;
                        audioFiles.push(audioPath);
                        supabaseAudioPaths.push(audioFileName);

                        console.log(`    ✅ Audio ready & uploaded: ${urlData.publicUrl}`);
                    }
                } catch (audioErr) {
                    console.error(`    ❌ Failed to generate/upload audio for scene ${i}:`, audioErr);
                }
            }
        }

        const compositionId = 'LoanBriefing';
        const composition = await selectComposition({
            serveUrl: bundled,
            id: compositionId,
            inputProps: { manifest: transformedManifest, analysis },
        });

        composition.durationInFrames = durationInFrames;

        console.log(`🚀 [${videoId}] Calling renderMedia...`);

        // Limit concurrency based on environment (Free tier = 1)
        const concurrency = process.env.REMOTION_CONCURRENCY ? parseInt(process.env.REMOTION_CONCURRENCY) : 4;
        console.log(`⚙️ [${videoId}] Concurrency set to: ${concurrency}`);

        let lastUpdate = Date.now();
        await renderMedia({
            composition,
            serveUrl: bundled,
            codec: 'h264',
            outputLocation,
            inputProps: { manifest: transformedManifest, analysis },
            concurrency,
            chromiumOptions: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            onProgress: async ({ progress }) => {
                // Update every 1000ms to avoid spamming Supabase
                if (Date.now() - lastUpdate > 1000) {
                    const totalProgress = 30 + Math.round(progress * 60); // 30-90% range
                    await supabase
                        .from('videos')
                        .update({
                            progress: totalProgress,
                            progress_label: `Rendering (${Math.round(progress * 100)}%)`
                        })
                        .eq('id', videoId);
                    lastUpdate = Date.now();
                }
            }
        });

        console.log(`✅ [${videoId}] Render complete! Uploading video...`);
        await supabase
            .from('videos')
            .update({ progress: 95, progress_label: 'Uploading to storage' })
            .eq('id', videoId);

        // Upload Video to Supabase
        // Use stream to avoid OOM on large files
        const videoFile = fs.createReadStream(outputLocation);
        const fileName = `${videoId}.mp4`;

        // Use Render's public URL as fallback, otherwise localhost
        const publicHost = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        console.log(`🌐 [${videoId}] Configured Public Host: ${publicHost}`);

        let videoUrl = `${publicHost}/videos/${videoId}.mp4`;
        console.log(`📡 [${videoId}] Initial Video URL Assumption: ${videoUrl}`);

        try {
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, videoFile, {
                    contentType: 'video/mp4',
                    upsert: true,
                    duplex: 'half'
                });

            if (uploadError) {
                console.error(`⚠️ [${videoId}] Upload error:`, uploadError);
            } else {
                const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
                videoUrl = urlData.publicUrl;
            }
        } catch (err) {
            console.error(`⚠️ [${videoId}] Upload failed, using local URL:`, err);
        }

        // Update DB with success
        await supabase
            .from('videos')
            .update({
                video_url: videoUrl,
                status: 'completed',
                progress: 100,
                progress_label: 'Finished',
                isReady: true,
                storage_metadata: { duration: totalDurationInSeconds, frames: durationInFrames }
            })
            .eq('id', videoId);

        console.log(`✨ [${videoId}] Process finished successfully: ${videoUrl}`);

        // Return success response to the client
        return res.json({ videoId, videoUrl, status: 'completed' });

    } catch (error) {
        console.error(`💥 [${videoId}] Render failed:`, error);
        await supabase
            .from('videos')
            .update({ status: 'failed' })
            .eq('id', videoId);

        return res.status(500).json({ error: error.message });

    } finally {
        // Cleanup local and cloud files
        console.log(`🧹 [${videoId}] Starting cleanup...`);

        if (fs.existsSync(outputLocation)) {
            try { fs.unlinkSync(outputLocation); } catch (err) { }
        }

        for (const localPath of audioFiles) {
            if (fs.existsSync(localPath)) {
                try { fs.unlinkSync(localPath); } catch (err) { }
            }
        }

        if (supabaseAudioPaths.length > 0) {
            try {
                await supabase.storage.from(BUCKET_NAME).remove(supabaseAudioPaths);
            } catch (err) { }
        }
    }
});

// Serve static assets
app.use('/videos', express.static(outputDir));
app.use('/audio', express.static(audioDir));

app.listen(PORT, () => {
    console.log(`🚀 Video Generator service running on http://localhost:${PORT}`);
});
