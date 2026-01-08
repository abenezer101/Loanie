import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LoanBriefing"
        component={Main as any}
        durationInFrames={300} // This will be overridden by the renderer
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          manifest: null as any,
          analysis: null as any,
        }}
      />
    </>
  );
};
