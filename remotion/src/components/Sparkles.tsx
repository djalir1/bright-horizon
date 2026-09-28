import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, random } from "remotion";

export const Sparkles: React.FC<{ count?: number; opacity?: number }> = ({ count = 80, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i + 1;
        const baseX = random(`x${seed}`) * width;
        const baseY = random(`y${seed}`) * height;
        const drift = Math.sin((frame / 30 + random(`p${seed}`) * Math.PI * 2)) * 18;
        const driftY = Math.cos((frame / 35 + random(`q${seed}`) * Math.PI * 2)) * 14;
        const size = 1 + random(`s${seed}`) * 3;
        const tw = (Math.sin(frame / 8 + random(`t${seed}`) * 10) + 1) / 2;
        const fade = interpolate(frame, [0, 20, durationInFrames - 20, durationInFrames], [0, 1, 1, 0]);
        const isGold = random(`c${seed}`) > 0.35;
        const color = isGold ? "#C9A84C" : "#E8D5A3";
        return (
          <div key={i} style={{
            position: "absolute",
            left: baseX + drift,
            top: baseY + driftY,
            width: size,
            height: size,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 ${4 + size * 3}px ${color}`,
            opacity: opacity * fade * (0.35 + tw * 0.65),
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

export const GoldGradientBg: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (Math.sin(frame / 90) + 1) / 2;
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at ${30 + t * 40}% ${20 + t * 60}%, rgba(201,168,76,0.18), transparent 60%), #050505`,
    }} />
  );
};