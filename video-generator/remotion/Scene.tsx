import React from 'react';

import { 
  AbsoluteFill, 
  interpolate, 
  useCurrentFrame, 
  useVideoConfig, 
  staticFile,
  spring,
  Sequence
} from 'remotion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Leaf, 
  Users, 
  Building2
} from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { VideoScene as VideoSceneType, LoanAnalysis, VisualComponent } from './types';
import { Circle, Rect, Triangle } from '@remotion/shapes';
import { makeTransform, translateY } from '@remotion/animation-utils';

interface SceneProps {
  scene: VideoSceneType;
  analysis: LoanAnalysis;
}

// Safe area boundaries (maintain 5% padding on all sides)
const SAFE_AREA_PADDING = {
  top: 54,    // 5% of 1080
  bottom: 54,
  left: 96,   // 5% of 1920
  right: 96
};

export const Scene: React.FC<SceneProps> = ({ scene, analysis }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Audio Debug
  if (frame === 0) {
    if (scene.narration?.audioUrl) {
      console.log(`🎬 [Scene ${scene.id}] Audio detected, starts with: ${scene.narration.audioUrl.substring(0, 50)}...`);
    } else {
      console.log(`⚠️ [Scene ${scene.id}] NO AUDIO URL FOUND!`);
    }
  }

  // Professional spring animations
  const fadeIn = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 0.5
    }
  });

  const slideUp = spring({
    frame: frame - 5,
    fps,
    from: 60,
    to: 0,
    config: {
      damping: 100,
      stiffness: 200
    }
  });

  const scaleIn = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: {
      damping: 200,
      stiffness: 100
    }
  });

  // Calculate safe content area
  const contentWidth = width - SAFE_AREA_PADDING.left - SAFE_AREA_PADDING.right;
  const contentHeight = height - SAFE_AREA_PADDING.top - SAFE_AREA_PADDING.bottom;
  const maxContentWidth = Math.min(contentWidth, 1600); // Maximum content width

  const renderComponent = (component: VisualComponent, index: number) => {
    if (!component) return null;

    // Stagger animation for multiple items
    const staggerDelay = index * 3;
    const itemFadeIn = spring({
      frame: frame - staggerDelay,
      fps,
      config: {
        damping: 200,
        stiffness: 100,
        mass: 0.5
      }
    });

    const itemSlideUp = spring({
      frame: frame - staggerDelay - 5,
      fps,
      from: 40,
      to: 0,
      config: {
        damping: 100,
        stiffness: 200
      }
    });

    switch (component.type) {
      case "title":
        return (
          <div 
            key={index} 
            style={{ 
              fontSize: Math.min(72, contentWidth / 15),
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: '48px',
              textAlign: 'center',
              width: '100%',
              maxWidth: maxContentWidth,
              opacity: itemFadeIn,
              transform: `translateY(${itemSlideUp}px) scale(${scaleIn})`,
              padding: '0 40px',
              wordWrap: 'break-word',
              overflow: 'hidden'
            }}
          >
            {component.text}
          </div>
        );

      case "subtitle":
        return (
          <div 
            key={index} 
            style={{ 
              fontSize: Math.min(36, contentWidth / 30),
              color: '#94a3b8', 
              marginBottom: '32px',
              textAlign: 'center',
              width: '100%',
              maxWidth: maxContentWidth,
              opacity: itemFadeIn,
              transform: `translateY(${itemSlideUp}px)`,
              padding: '0 40px',
              wordWrap: 'break-word'
            }}
          >
            {component.text}
          </div>
        );

      case "data_card":
        return (
          <div 
            key={index} 
            style={{ 
              backgroundColor: 'rgba(31, 41, 55, 0.8)', 
              border: '2px solid rgba(255, 255, 255, 0.15)', 
              borderRadius: '24px', 
              padding: '32px 24px',
              textAlign: 'center',
              flex: '1 1 0',
              minWidth: '200px',
              maxWidth: '350px',
              opacity: itemFadeIn,
              transform: `translateY(${itemSlideUp}px) scale(${itemFadeIn})`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Decorative shape */}
            <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
              <Circle
                radius={60}
                fill="white"
              />
            </div>
            
            <p style={{ 
              fontSize: Math.min(28, contentWidth / 40), 
              color: '#94a3b8', 
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              {component.title}
            </p>
            <p style={{ 
              fontSize: Math.min(48, contentWidth / 25), 
              fontWeight: 'bold', 
              color: 'white',
              wordBreak: 'break-word'
            }}>
              {component.value}
            </p>
          </div>
        );

      case "key_value":
        return (
          <div 
            key={index} 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: component.items && component.items.length > 2 
                ? 'repeat(auto-fit, minmax(250px, 1fr))' 
                : '1fr 1fr',
              gap: '32px', 
              width: '100%', 
              maxWidth: maxContentWidth,
              padding: '0 20px'
            }}
          >
            {component.items?.map((item, i) => {
              const cardFadeIn = spring({
                frame: frame - (i * 4),
                fps,
                config: { damping: 200, stiffness: 100, mass: 0.5 }
              });
              
              return (
                <div 
                  key={i} 
                  style={{ 
                    backgroundColor: 'rgba(31, 41, 55, 0.7)', 
                    border: '2px solid rgba(255, 255, 255, 0.15)', 
                    borderRadius: '24px', 
                    padding: '32px 24px',
                    textAlign: 'center',
                    opacity: cardFadeIn,
                    transform: `scale(${cardFadeIn})`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <p style={{ 
                    fontSize: Math.min(24, contentWidth / 50), 
                    color: '#9ca3af', 
                    marginBottom: '12px'
                  }}>
                    {item.label}
                  </p>
                  <p style={{ 
                    fontSize: Math.min(44, contentWidth / 30), 
                    fontWeight: 'bold', 
                    color: 'white',
                    wordBreak: 'break-word'
                  }}>
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        );

      case "metric_card":
        const TrendIcon = component.trend === "up" ? TrendingUp : component.trend === "down" ? TrendingDown : Minus;
        const trendColor = component.trend === "up" ? "#4ade80" : component.trend === "down" ? "#f87171" : "#9ca3af";
        return (
          <div 
            key={index} 
            style={{ 
              backgroundColor: 'rgba(31, 41, 55, 0.7)', 
              border: '3px solid rgba(255, 255, 255, 0.15)', 
              borderRadius: '32px', 
              padding: '48px 40px',
              textAlign: 'center', 
              width: '100%', 
              maxWidth: Math.min(700, maxContentWidth),
              opacity: itemFadeIn,
              transform: `translateY(${itemSlideUp}px) scale(${scaleIn})`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <p style={{ 
              fontSize: Math.min(32, contentWidth / 35), 
              color: '#9ca3af', 
              marginBottom: '20px',
              fontWeight: '600'
            }}>
              {component.label}
            </p>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '24px',
              flexWrap: 'wrap'
            }}>
              <p style={{ 
                fontSize: Math.min(80, contentWidth / 15), 
                fontWeight: 'bold', 
                color: '#60a5fa'
              }}>
                {component.value}
              </p>
              <TrendIcon 
                size={Math.min(64, contentWidth / 20)} 
                color={trendColor} 
                strokeWidth={3}
              />
            </div>
          </div>
        );

      case "bar_chart":
        const chartWidth = Math.min(maxContentWidth - 100, width - 300);
        return (
          <div 
            key={index} 
            style={{ 
              width: '100%', 
              maxWidth: maxContentWidth,
              opacity: itemFadeIn,
              transform: `translateY(${itemSlideUp}px)`
            }}
          >
            <p style={{ 
              fontSize: Math.min(36, contentWidth / 30), 
              color: '#9ca3af', 
              marginBottom: '32px',
              textAlign: 'center',
              fontWeight: '600'
            }}>
              {component.title}
            </p>
            <div style={{ 
              height: Math.min(400, contentHeight / 2), 
              display: 'flex', 
              justifyContent: 'center',
              padding: '0 20px'
            }}>
              <BarChart 
                width={chartWidth} 
                height={Math.min(400, contentHeight / 2)} 
                data={component.data || []}
              >
                <XAxis 
                  dataKey="year" 
                  tick={{ fill: "#9ca3af", fontSize: Math.min(20, contentWidth / 60) }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis hide />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6" 
                  radius={[12, 12, 0, 0]} 
                  animationDuration={800}
                  animationBegin={staggerDelay * 16.67}
                />
              </BarChart>
            </div>
          </div>
        );

      case "risk_table":
        return (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              width: '100%', 
              maxWidth: maxContentWidth,
              padding: '0 20px'
            }}
          >
            {component.risks?.slice(0, 4).map((risk, i) => {
              const riskFadeIn = spring({
                frame: frame - (i * 5),
                fps,
                config: { damping: 200, stiffness: 100, mass: 0.5 }
              });

              return (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '24px',
                    backgroundColor: 'rgba(31, 41, 55, 0.7)', 
                    border: '2px solid rgba(255, 255, 255, 0.15)', 
                    borderRadius: '24px', 
                    padding: '24px 28px',
                    opacity: riskFadeIn,
                    transform: `translateX(${interpolate(riskFadeIn, [0, 1], [-40, 0])})`,
                    flexWrap: 'wrap'
                  }}
                >
                  <AlertTriangle
                    size={Math.min(48, contentWidth / 30)}
                    color={risk.severity === "high" ? "#f87171" : risk.severity === "medium" ? "#fbbf24" : "#4ade80"}
                    strokeWidth={2.5}
                  />
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ 
                      fontSize: Math.min(32, contentWidth / 40), 
                      fontWeight: 'bold', 
                      color: 'white',
                      marginBottom: '4px',
                      wordBreak: 'break-word'
                    }}>
                      {risk.factor}
                    </p>
                    <p style={{ 
                      fontSize: Math.min(22, contentWidth / 60), 
                      color: '#9ca3af',
                      wordBreak: 'break-word'
                    }}>
                      {risk.mitigant}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case "covenant_list":
        return (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              width: '100%', 
              maxWidth: maxContentWidth,
              padding: '0 20px'
            }}
          >
            {component.covenants?.slice(0, 5).map((covenant, i) => {
              const covenantFadeIn = spring({
                frame: frame - (i * 4),
                fps,
                config: { damping: 200, stiffness: 100, mass: 0.5 }
              });

              return (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(31, 41, 55, 0.7)', 
                    border: '2px solid rgba(255, 255, 255, 0.15)', 
                    borderRadius: '24px', 
                    padding: '24px 28px',
                    opacity: covenantFadeIn,
                    transform: `scale(${covenantFadeIn})`,
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {covenant.compliant ? (
                      <CheckCircle size={Math.min(40, contentWidth / 35)} color="#4ade80" strokeWidth={2.5} />
                    ) : (
                      <XCircle size={Math.min(40, contentWidth / 35)} color="#f87171" strokeWidth={2.5} />
                    )}
                    <span style={{ 
                      fontSize: Math.min(28, contentWidth / 45), 
                      fontWeight: '600', 
                      color: 'white',
                      wordBreak: 'break-word'
                    }}>
                      {covenant.type}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: Math.min(22, contentWidth / 60), 
                    color: '#9ca3af',
                    wordBreak: 'break-word'
                  }}>
                    {covenant.status}
                  </span>
                </div>
              );
            })}
          </div>
        );

      case "esg_scores":
        return (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              gap: '32px',
              justifyContent: 'center', 
              width: '100%',
              flexWrap: 'wrap',
              padding: '0 20px'
            }}
          >
            {[
              { label: 'Environmental', icon: Leaf, score: (component as any).scores?.environmental, color: '#4ade80' },
              { label: 'Social', icon: Users, score: (component as any).scores?.social, color: '#60a5fa' },
              { label: 'Governance', icon: Building2, score: (component as any).scores?.governance, color: '#a78bfa' }
            ].map((item, i) => {
              const esgFadeIn = spring({
                frame: frame - (i * 6),
                fps,
                config: { damping: 200, stiffness: 100, mass: 0.5 }
              });

              return (
                <div 
                  key={i} 
                  style={{ 
                    backgroundColor: 'rgba(31, 41, 55, 0.7)', 
                    border: '3px solid rgba(255, 255, 255, 0.15)', 
                    borderRadius: '32px', 
                    padding: '36px 32px',
                    textAlign: 'center', 
                    flex: '1 1 250px',
                    maxWidth: '350px',
                    minWidth: '200px',
                    opacity: esgFadeIn,
                    transform: `translateY(${interpolate(esgFadeIn, [0, 1], [40, 0])}) scale(${esgFadeIn})`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}>
                    <item.icon 
                      size={Math.min(64, contentWidth / 25)} 
                      color={item.color} 
                      strokeWidth={2.5}
                    />
                  </div>
                  <p style={{ 
                    fontSize: Math.min(24, contentWidth / 50), 
                    color: '#9ca3af', 
                    marginBottom: '12px',
                    fontWeight: '600'
                  }}>
                    {item.label}
                  </p>
                  <p style={{ 
                    fontSize: Math.min(64, contentWidth / 20), 
                    fontWeight: 'bold', 
                    color: 'white'
                  }}>
                    {item.score || "N/A"}
                  </p>
                </div>
              );
            })}
          </div>
        );

      case "recommendation":
        const decision = typeof component.decision === 'string' ? component.decision : '';
        const decisionLower = decision.toLowerCase();
        const decisionColor = decisionLower === "approve" ? "#4ade80" : decisionLower === "conditional" ? "#fbbf24" : "#f87171";
        const decisionBg = decisionLower === "approve" ? "rgba(74, 222, 128, 0.15)" : decisionLower === "conditional" ? "rgba(251, 191, 36, 0.15)" : "rgba(248, 113, 113, 0.15)";
        
        return (
          <div 
            key={index} 
            style={{ 
              textAlign: 'center', 
              width: '100%', 
              maxWidth: maxContentWidth,
              opacity: itemFadeIn,
              transform: `translateY(${itemSlideUp}px)`,
              padding: '0 40px'
            }}
          >
            <div
              style={{ 
                fontSize: Math.min(52, contentWidth / 20),
                padding: '20px 60px',
                display: 'inline-flex', 
                alignItems: 'center', 
                borderRadius: '80px',
                fontWeight: 'bold', 
                marginBottom: '48px',
                color: decisionColor,
                backgroundColor: decisionBg,
                border: `3px solid ${decisionColor}44`,
                transform: `scale(${scaleIn})`
              }}
            >
              {decision.toUpperCase()}
            </div>
            <p style={{ 
              fontSize: Math.min(32, contentWidth / 35),
              color: '#d1d5db', 
              lineHeight: '1.7',
              padding: '0 60px',
              wordWrap: 'break-word'
            }}>
              {typeof component.rationale === 'string' 
                ? component.rationale 
                : Array.isArray(component.rationale) 
                  ? component.rationale.join('. ') 
                  : ''}
            </p>
          </div>
        );

      case "confidence_indicator":
        const confColor = component.confidence === "HIGH" ? "#4ade80" : component.confidence === "MEDIUM" ? "#fbbf24" : "#f87171";
        return (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)', 
              padding: '40px 36px',
              borderRadius: '36px',
              border: '3px solid rgba(255, 255, 255, 0.15)', 
              width: '100%', 
              maxWidth: Math.min(900, maxContentWidth),
              opacity: itemFadeIn,
              transform: `scale(${scaleIn})`,
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Circle
                radius={12}
                fill={confColor}
                style={{
                  filter: `drop-shadow(0 0 20px ${confColor})`
                }}
              />
              <span style={{ 
                fontSize: Math.min(28, contentWidth / 40),
                fontWeight: 'bold', 
                color: 'rgba(255,255,255,0.8)', 
                letterSpacing: '2px'
              }}>
                CONFIDENCE: {component.confidence}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ 
                fontSize: Math.min(48, contentWidth / 25),
                fontWeight: '900', 
                color: component.status === "COMPLETE" ? "#4ade80" : "#f87171",
                letterSpacing: '-1px',
                wordBreak: 'break-word'
              }}>
                {component.status?.replace("_", " ")}
              </p>
              {component.source && (
                <p style={{ 
                  fontSize: Math.min(22, contentWidth / 60),
                  color: 'rgba(255,255,255,0.4)', 
                  marginTop: '16px',
                  fontStyle: 'italic',
                  wordBreak: 'break-word'
                }}>
                  Provenance: {component.source}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AbsoluteFill 
      style={{ 
        backgroundColor: '#0f172a', 
        color: 'white',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Background Decor */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          width: '1000px', 
          height: '1000px', 
          backgroundColor: '#3b82f6', 
          borderRadius: '50%', 
          filter: 'blur(200px)', 
          transform: 'translate(40%, -40%)' 
        }} />
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          width: '800px', 
          height: '800px', 
          backgroundColor: '#4f46e5', 
          borderRadius: '50%', 
          filter: 'blur(150px)', 
          transform: 'translate(-30%, 30%)' 
        }} />
      </div>

      {/* Safe Content Area */}
      <div 
        style={{ 
          position: 'absolute',
          top: SAFE_AREA_PADDING.top,
          left: SAFE_AREA_PADDING.left,
          right: SAFE_AREA_PADDING.right,
          bottom: SAFE_AREA_PADDING.bottom,
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
      >
        <div 
          style={{ 
            width: '100%',
            height: '100%',
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '36px',
            opacity: fadeIn,
            transform: `translateY(${slideUp}px)`
          }}
        >
          {(() => {
            const components = scene?.visuals?.components || [];
            const groupedElements: React.ReactNode[] = [];
            let i = 0;

            while (i < components.length) {
              const currentComp = components[i];
              
              // Check if this is a data_card and if there are consecutive data_cards
              if (currentComp.type === 'data_card') {
                const dataCards: typeof components = [currentComp];
                let j = i + 1;
                
                // Collect consecutive data_cards
                while (j < components.length && components[j].type === 'data_card') {
                  dataCards.push(components[j]);
                  j++;
                }
                
                // Render all data_cards in a horizontal container
                groupedElements.push(
                  <div 
                    key={`data-cards-${i}`}
                    style={{ 
                      display: 'flex', 
                      gap: '32px',
                      justifyContent: 'center', 
                      width: '100%',
                      flexWrap: 'wrap',
                      padding: '0 20px'
                    }}
                  >
                    {dataCards.map((card, cardIdx) => renderComponent(card, i + cardIdx))}
                  </div>
                );
                
                i = j; // Skip past all the data_cards we just processed
              } else {
                // Render other component types normally
                groupedElements.push(
                  <React.Fragment key={i}>
                    {renderComponent(currentComp, i)}
                  </React.Fragment>
                );
                i++;
              }
            }
            
            return groupedElements;
          })()}
        </div>
      </div>

      {/* Captions - Always visible at bottom in safe area */}
      {scene?.narration?.text && (
        <div 
          style={{ 
            position: 'absolute',
            bottom: SAFE_AREA_PADDING.bottom + 20,
            left: SAFE_AREA_PADDING.left + 40,
            right: SAFE_AREA_PADDING.right + 40,
            borderRadius: '16px',
            padding: '24px 40px',
            borderTop: '2px solid rgba(99, 102, 241, 0.4)',
            zIndex: 100,
            opacity: fadeIn,
            maxHeight: '180px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <p 
            style={{ 
              fontSize: Math.min(32, contentWidth / 35),
              color: '#e5e7eb',
              textAlign: 'center',
              lineHeight: '1.5',
              fontWeight: '500',
              wordWrap: 'break-word',
              margin: 0
            }}
          >
            "{scene.narration.text}"
          </p>
        </div>
      )}

      {/* Branding - Safe area bottom-right */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: SAFE_AREA_PADDING.bottom - 30,
          right: SAFE_AREA_PADDING.right,
          display: 'flex', 
          alignItems: 'center',
          gap: '12px',
          opacity: 0.7,
          zIndex: 50
        }}
      >
        <div 
          style={{ 
            width: '52px', 
            height: '52px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img 
            src={staticFile("/images/logo.png")} 
            alt="Loanie" 
            style={{ width: '36px', height: '36px', objectFit: 'contain' }} 
          />
        </div>
        <span 
          style={{ 
            fontSize: '32px',
            fontWeight: '900', 
            letterSpacing: '-1px',
            color: 'white',
            fontFamily: 'system-ui'
          }}
        >
          LOANIE
        </span>
      </div>
    </AbsoluteFill>
  );
};
