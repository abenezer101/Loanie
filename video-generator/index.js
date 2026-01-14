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
const os = require('os');
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

// In-memory status tracking for immediate responsiveness
const activeRenders = new Map();

// Bundle cache to avoid rebundling on every request
let bundleCache = null;
async function getBundle() {
    if (bundleCache) return bundleCache;
    console.log("📦 Creating fresh bundle...");
    const inputPath = path.resolve(__dirname, 'remotion', 'index.tsx');
    bundleCache = await bundle(inputPath);
    return bundleCache;
}

// Transform AI manifest format to Remotion expected format
function transformManifest(aiManifest) {
    if (!aiManifest) return null;

    const scenes = aiManifest.scenes || [];

    return {
        meta: aiManifest.meta || {
            loan_id: 'unknown',
            version: '1.0',
            theme: 'institutional-dark',
            resolution: '1280x720', // Faster rendering than 1080p
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

// Status Endpoint
app.get('/status/:videoId', async (req, res) => {
    const { videoId } = req.params;
    console.log(`🔍 Checking status for video: ${videoId}`);

    // 1. Check in-memory first for high responsiveness
    if (activeRenders.has(videoId)) {
        console.log(`  - Found in memory:`, activeRenders.get(videoId));
        return res.json(activeRenders.get(videoId));
    }

    // 2. Fallback to Supabase if not in memory (rendered by another instance or memory cleared)
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', videoId)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const statusResponse = {
            status: data.status,
            progress: data.progress || 0,
            progressLabel: data.progress_label || '',
            videoUrl: data.video_url || null
        };

        console.log(`  - Found in DB:`, statusResponse);
        return res.json(statusResponse);
    } catch (err) {
        console.error(`❌ Error fetching status from DB:`, err);
        return res.status(500).json({ error: 'Failed to fetch status' });
    }
});

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

    console.log(`🎬 [${videoId}] Initiation requested for manifest_id: ${manifest_id}`);

    // Return early to prevent HTTP timeout
    res.json({ videoId, status: 'processing' });

    // Initial state in memory
    activeRenders.set(videoId, {
        status: 'processing',
        progress: 0,
        progressLabel: 'Starting render...',
        videoUrl: null
    });

    // Start background render
    (async () => {
        let audioFiles = [];
        let supabaseAudioPaths = [];
        const BUCKET_NAME = 'narration-audio';

        try {
            console.log(`🎬 [${videoId}] Background render starting...`);

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

            // Update status in DB and memory
            if (manifest_id) {
                const initialStatus = {
                    id: videoId,
                    manifest_id: manifest_id,
                    status: 'processing',
                    progress: 5,
                    progress_label: 'Bundling project'
                };

                activeRenders.set(videoId, {
                    ...activeRenders.get(videoId),
                    progress: 5,
                    progressLabel: 'Bundling project'
                });

                await supabase
                    .from('videos')
                    .upsert([initialStatus]);
            }

            const bundled = await getBundle();

            // Step: Generate Narration Audio for each scene if missing
            console.log(`🔊 [${videoId}] Generating narration audio and uploading to Supabase...`);

            const totalScenes = transformedManifest.scenes.length;
            let audioCompleted = 0;

            console.log(`🔊 [${videoId}] Generating narration audio for ${totalScenes} scenes in parallel...`);

            await Promise.all(transformedManifest.scenes.map(async (scene, i) => {
                if (scene.narration && scene.narration.text && !scene.narration.audioUrl) {
                    try {
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

                            const audioBuffer = fs.readFileSync(audioPath);
                            const { error: uploadError } = await supabase.storage
                                .from(BUCKET_NAME)
                                .upload(audioFileName, audioBuffer, {
                                    contentType: 'audio/mpeg',
                                    upsert: true
                                });

                            if (uploadError) throw uploadError;

                            const { data: urlData } = supabase.storage
                                .from(BUCKET_NAME)
                                .getPublicUrl(audioFileName);

                            scene.narration.audioUrl = urlData.publicUrl;
                            audioFiles.push(audioPath);
                            supabaseAudioPaths.push(audioFileName);
                        }
                    } catch (audioErr) {
                        console.error(`    ❌ Failed to generate audio for scene ${i}:`, audioErr);
                    }
                }

                // Track progress
                audioCompleted++;
                const audioProgress = Math.round((audioCompleted / totalScenes) * 25) + 5;
                const label = `Generating Audio (${audioCompleted}/${totalScenes})`;

                activeRenders.set(videoId, {
                    ...activeRenders.get(videoId),
                    progress: audioProgress,
                    progressLabel: label
                });

                await supabase
                    .from('videos')
                    .update({ progress: audioProgress, progress_label: label })
                    .eq('id', videoId);
            }));

            const compositionId = 'LoanBriefing';
            const composition = await selectComposition({
                serveUrl: bundled,
                id: compositionId,
                inputProps: { manifest: transformedManifest, analysis },
            });

            composition.durationInFrames = durationInFrames;

            console.log(`🚀 [${videoId}] Calling renderMedia...`);

            console.log(`🎮 [${videoId}] GPU Acceleration enabled`);

            let lastUpdate = Date.now();
            await renderMedia({
                composition,
                serveUrl: bundled,
                codec: 'h264',
                outputLocation,
                inputProps: { manifest: transformedManifest, analysis },
                chromiumOptions: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-extensions',
                        '--autoplay-policy=no-user-gesture-required',
                        '--disable-gpu', // Use software rendering for stability on laptops
                    ]
                },
                concurrency: process.env.RENDER_CONCURRENCY ? parseInt(process.env.RENDER_CONCURRENCY) : Math.min(os.cpus().length, 3),
                onProgress: async ({ progress }) => {
                    // Update every 1000ms to avoid spamming Supabase
                    if (Date.now() - lastUpdate > 1000) {
                        const totalProgress = 30 + Math.round(progress * 60); // 30-90% range
                        const label = `Rendering (${Math.round(progress * 100)}%)`;

                        activeRenders.set(videoId, {
                            ...activeRenders.get(videoId),
                            progress: totalProgress,
                            progressLabel: label
                        });

                        // 1. Update legacy videos table (optional/cleanup)
                        await supabase
                            .from('videos')
                            .update({ progress: totalProgress, progress_label: label })
                            .eq('id', videoId);

                        // 2. Update Primary Artifacts table
                        if (manifest_id) {
                            try {
                                const { data: m } = await supabase.from('video_manifests').select('analysis_id').eq('id', manifest_id).single();
                                if (m?.analysis_id) {
                                    await supabase.from('artifacts').update({ video_status: label }).eq('analysis_id', m.analysis_id);
                                }
                            } catch (e) { }
                        }

                        lastUpdate = Date.now();
                    }
                }
            });

            console.log(`✅ [${videoId}] Render complete! Uploading video...`);
            activeRenders.set(videoId, {
                ...activeRenders.get(videoId),
                progress: 95,
                progressLabel: 'Uploading to storage'
            });
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

            // Update DB and memory with success
            const finalStatus = {
                video_url: videoUrl,
                status: 'completed',
                progress: 100,
                progress_label: 'Finished',
                isReady: true,
                storage_metadata: { duration: totalDurationInSeconds, frames: durationInFrames }
            };

            activeRenders.set(videoId, {
                status: 'completed',
                progress: 100,
                progressLabel: 'Finished',
                videoUrl: videoUrl
            });

            console.log(`💾 [${videoId}] Updating database with final status...`);
            const { error: updateError } = await supabase
                .from('videos')
                .update(finalStatus)
                .eq('id', videoId);

            if (updateError) {
                console.error(`❌ [${videoId}] Failed to update database:`, updateError);
                // Retry once
                console.log(`🔄 [${videoId}] Retrying database update...`);
                const { error: retryError } = await supabase
                    .from('videos')
                    .update(finalStatus)
                    .eq('id', videoId);

                if (retryError) {
                    console.error(`❌ [${videoId}] Retry failed:`, retryError);
                } else {
                    console.log(`✅ [${videoId}] Database updated on retry`);
                }
            } else {
                console.log(`✅ [${videoId}] Database updated successfully`);
            }

            console.log(`✨ [${videoId}] Process finished successfully: ${videoUrl}`);

            // Sync with artifacts table
            if (manifest_id) {
                try {
                    // Find the manifest to get analysis_id
                    const { data: manifestData } = await supabase
                        .from('video_manifests')
                        .select('analysis_id')
                        .eq('id', manifest_id)
                        .single();

                    if (manifestData?.analysis_id) {
                        await supabase
                            .from('artifacts')
                            .update({
                                video_url: videoUrl,
                                video_status: 'completed'
                            })
                            .eq('analysis_id', manifestData.analysis_id);
                        console.log(`✅ [${videoId}] Artifact table synced`);
                    }
                } catch (syncErr) {
                    console.error(`⚠️ [${videoId}] Failed to sync artifact:`, syncErr);
                }
            }


        } catch (error) {
            console.error(`💥 [${videoId}] Render failed:`, error);
            activeRenders.set(videoId, {
                ...activeRenders.get(videoId),
                status: 'failed',
                progressLabel: 'Render Failed'
            });
            await supabase
                .from('videos')
                .update({ status: 'failed' })
                .eq('id', videoId);

            // Sync failure to artifacts table
            if (manifest_id) {
                try {
                    const { data: manifestData } = await supabase
                        .from('video_manifests')
                        .select('analysis_id')
                        .eq('id', manifest_id)
                        .single();
                    if (manifestData?.analysis_id) {
                        await supabase
                            .from('artifacts')
                            .update({ video_status: 'failed' })
                            .eq('analysis_id', manifestData.analysis_id);
                    }
                } catch (e) { }
            }

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

            // Remove from activeRenders after a short delay to allow final polling
            setTimeout(() => {
                activeRenders.delete(videoId);
                console.log(`🧹 [${videoId}] Memory cache cleared`);
            }, 30000); // 30 seconds
        }
    })();
});

// Serve static assets
app.use('/videos', express.static(outputDir));
app.use('/audio', express.static(audioDir));

app.listen(PORT, () => {
    console.log(`🚀 Video Generator service running on http://localhost:${PORT}`);
});
