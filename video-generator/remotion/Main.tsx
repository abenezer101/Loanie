import React from 'react';
import { Series, Audio, AbsoluteFill } from 'remotion';
import { VideoManifest, LoanAnalysis } from './types';
import { Scene } from './Scene';

export interface MainProps {
  manifest: VideoManifest;
  analysis: LoanAnalysis;
}

export const Main: React.FC<MainProps> = ({ manifest, analysis }) => {
  if (!manifest) return null;

  const fps = manifest.meta.fps || 30;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      <Series>
        {manifest.scenes.map((scene, index) => {
          const durationInFrames = Math.max(1, Math.floor(scene.duration * fps));
          return (
            <Series.Sequence key={scene.id || index} durationInFrames={durationInFrames}>
              <Scene scene={scene} analysis={analysis} />
              {scene.narration?.audioUrl && (
                <Audio src={scene.narration.audioUrl} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
