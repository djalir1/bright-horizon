import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { Crown, Sparkles as LSparkles, Music, Camera, Headphones, Utensils, Mic2, Calendar, MapPin, Mail, AtSign, Globe } from "lucide-react";
import { SERIF, SANS } from "./fonts";
import { Sparkles } from "./components/Sparkles";

// EDITORIAL CREAM PALETTE
const CREAM = "#F5F0E8";
const CREAM_DEEP = "#EBE3D3";
const INK = "#1A1A1A";
const GOLD = "#B8923A";
const GOLD_LIGHT = "#D4B05C";

// ============ SHARED BG ============
const PaperBg: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (Math.sin(frame / 110) + 1) / 2;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: CREAM }} />
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at ${30 + t * 40}% ${20 + t * 50}%, rgba(184,146,58,0.14), transparent 60%)`,
      }} />
      {/* paper grain */}
      <AbsoluteFill style={{
        opacity: 0.08,
        backgroundImage: "radial-gradient(rgba(0,0,0,0.6) 1px, transparent 1px)",
        backgroundSize: "3px 3px",
      }} />
    </AbsoluteFill>
  );
};

// Dark velvet background for contrast scenes
const VelvetBg: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (Math.sin(frame / 110) + 1) / 2;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#0A0A0A" }} />
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at ${30 + t * 40}% ${20 + t * 50}%, rgba(201,168,76,0.22), transparent 65%)`,
      }} />
      <AbsoluteFill style={{
        opacity: 0.06,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
        backgroundSize: "4px 4px",
      }} />
    </AbsoluteFill>
  );
};

const GoldDust: React.FC<{ count?: number; opacity?: number }> = ({ count = 50, opacity = 0.55 }) => {
  return <Sparkles count={count} opacity={opacity} />;
};

// thin gold rule line
const Rule: React.FC<{ width?: number; delay?: number; duration?: number }> = ({ width = 280, delay = 0, duration = 28 }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [delay, delay + duration], [0, width], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ height: 1, width: w, background: GOLD, opacity: 0.8 }} />;
};

// ============ SCENE 1 — HOOK (0–120) ============
// Ink stroke sweeps in. Gold "Kigali..." emerges. Couple silhouette fades behind.
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fadeOut = interpolate(frame, [108, 120], [1, 0], { extrapolateRight: "clamp" });

  // diagonal ink sweep
  const sweep = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const sweepOut = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" });

  // couple ghost
  const coupleO = interpolate(frame, [25, 55, 95, 115], [0, 0.5, 0.5, 0]);
  const coupleS = interpolate(frame, [25, 90], [1.05, 1.12]);

  // gold script
  const scriptO = interpolate(frame, [55, 80, 100, 115], [0, 1, 1, 0]);
  const scriptY = interpolate(frame, [55, 90], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <PaperBg />
      {/* couple ghost */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: coupleO }}>
        <Img src={staticFile("images/couple.png")} style={{
          width: 720, transform: `scale(${coupleS})`,
          filter: "sepia(0.3) saturate(1.1) brightness(1.05) opacity(0.85)",
          mixBlendMode: "multiply",
        }} />
      </AbsoluteFill>

      {/* ink diagonal stroke */}
      <AbsoluteFill style={{
        clipPath: `polygon(0 ${(1 - sweep) * 100}%, 100% ${Math.max(0, (1 - sweep) * 100 - 30)}%, 100% ${Math.max(0, (1 - sweepOut) * 100 - 30)}%, 0 ${(1 - sweepOut) * 100}%)`,
        background: INK,
        opacity: 0.92,
      }} />

      {/* gold script */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{
          fontFamily: SERIF, fontStyle: "italic", fontWeight: 600,
          fontSize: 180, color: GOLD,
          letterSpacing: "0.02em", opacity: scriptO,
          transform: `translateY(${scriptY}px)`,
          textShadow: "0 4px 30px rgba(184,146,58,0.25)",
        }}>Kigali…</div>
      </AbsoluteFill>
      <GoldDust count={35} opacity={0.4} />
    </AbsoluteFill>
  );
};

// ============ SCENE 2 — COUPLE / TAGLINE (120–270) ============
const SceneCouple: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [138, 150], [1, 0], { extrapolateRight: "clamp" });
  const { fps } = useVideoConfig();
  const cs = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 90 } });
  const coupleY = interpolate(frame, [0, 130], [0, -20]);

  const overlineO = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: "clamp" });
  const titleO = interpolate(frame, [45, 75], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [45, 80], [25, 0], { extrapolateRight: "clamp" });
  const subO = interpolate(frame, [85, 110], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <VelvetBg />
      <GoldDust count={55} opacity={0.7} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Img src={staticFile("images/couple.png")} style={{
          width: 500,
          transform: `scale(${0.92 + cs * 0.08}) translateY(${coupleY - 80}px)`,
          mixBlendMode: "screen",
          filter: "contrast(1.15) brightness(1.1) drop-shadow(0 20px 60px rgba(201,168,76,0.6))",
        }} />
      </AbsoluteFill>

      {/* Top overline */}
      <div style={{
        position: "absolute", top: 140, left: 0, right: 0,
        textAlign: "center", opacity: overlineO,
      }}>
        <div style={{
          fontFamily: SANS, fontSize: 28, color: GOLD_LIGHT,
          letterSpacing: "0.5em", fontWeight: 500, paddingLeft: "0.5em",
        }}>EST · 2026</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <Rule width={140} delay={28} duration={20} />
        </div>
      </div>

      {/* Bottom title block */}
      <div style={{
        position: "absolute", bottom: 220, left: 0, right: 0,
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: SERIF, fontStyle: "italic", fontWeight: 600,
          fontSize: 96, color: CREAM,
          letterSpacing: "0.01em", lineHeight: 1.05,
          opacity: titleO, transform: `translateY(${titleY}px)`,
        }}>
          An evening<br/>of <span style={{ color: GOLD_LIGHT }}>elegance.</span>
        </div>
        <div style={{
          marginTop: 30,
          fontFamily: SANS, fontSize: 26, color: CREAM_DEEP,
          letterSpacing: "0.35em", fontWeight: 400, opacity: subO,
          paddingLeft: "0.35em", textTransform: "uppercase",
        }}>For the class of 2026</div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 3 — PROMISE / ICONS (270–420) ============
const IconBeat: React.FC<{ start: number; label: string; Icon: React.ComponentType<any> }> = ({ start, label, Icon }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [start, start + 8, start + 26, start + 34], [0, 1, 1, 0]);
  const s = interpolate(frame, [start, start + 16], [0.85, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o, flexDirection: "column" }}>
      <div style={{
        width: 260, height: 260, borderRadius: "50%",
        border: `1.5px solid ${GOLD}`,
        background: "rgba(255,255,255,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${s})`,
        boxShadow: "0 20px 60px rgba(184,146,58,0.15)",
      }}>
        <Icon size={130} strokeWidth={1.3} color={GOLD} />
      </div>
      <div style={{
        marginTop: 40, fontFamily: SERIF, fontStyle: "italic",
        fontSize: 64, fontWeight: 600, color: INK,
        letterSpacing: "0.01em",
      }}>{label}</div>
    </AbsoluteFill>
  );
};

const ScenePromise: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [138, 150], [1, 0], { extrapolateRight: "clamp" });
  const beats: Array<[number, string, any]> = [
    [0, "Red Carpet", LSparkles],
    [28, "Crown Moment", Crown],
    [56, "Live Music", Music],
    [84, "Captured Memories", Camera],
  ];
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <PaperBg />
      <GoldDust count={30} opacity={0.3} />
      {beats.map(([s, l, I], i) => (
        <IconBeat key={i} start={s as number} label={l as string} Icon={I} />
      ))}
    </AbsoluteFill>
  );
};

// ============ SCENE 4 — TITLE REVEAL (420–600) ============
const SceneReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeOut = interpolate(frame, [168, 180], [1, 0], { extrapolateRight: "clamp" });

  const logoO = interpolate(frame, [5, 35], [0, 1], { extrapolateRight: "clamp" });
  const logoS = spring({ frame: frame - 5, fps, config: { damping: 16, stiffness: 90 } });

  const titleO = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [40, 75], [30, 0], { extrapolateRight: "clamp" });

  const subO = interpolate(frame, [75, 100], [0, 1], { extrapolateRight: "clamp" });
  const ruleDelay = 95;

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <VelvetBg />
      <GoldDust count={110} opacity={1} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Img src={staticFile("images/logo.png")} style={{
          width: 440, opacity: logoO,
          transform: `scale(${0.75 + logoS * 0.25})`,
          filter: "drop-shadow(0 0 50px rgba(201,168,76,0.8))",
        }} />
        <div style={{
          marginTop: 30,
          fontFamily: SERIF, fontWeight: 700, fontSize: 140,
          color: GOLD_LIGHT, letterSpacing: "0.06em",
          opacity: titleO, transform: `translateY(${titleY}px)`,
          textAlign: "center", lineHeight: 1,
          textShadow: "0 0 40px rgba(201,168,76,0.5)",
        }}>
          SENIOR&nbsp;GALA
        </div>
        <div style={{ marginTop: 24 }}>
          <Rule width={420} delay={ruleDelay} duration={30} />
        </div>
        <div style={{
          marginTop: 22, fontFamily: SANS, fontWeight: 500,
          fontSize: 48, color: CREAM, letterSpacing: "0.55em",
          opacity: subO, paddingLeft: "0.55em",
        }}>KIGALI 2026</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ============ SCENE 5 — EXPERIENCE LIST (600–780) ============
const SceneExperience: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [168, 180], [1, 0], { extrapolateRight: "clamp" });
  const headerO = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  const items: Array<{ label: string; Icon: any }> = [
    { label: "DJ Sets", Icon: Headphones },
    { label: "Dinner & Snacks", Icon: Utensils },
    { label: "Live Performers", Icon: Mic2 },
    { label: "Photo Booth", Icon: Camera },
    { label: "Red Carpet", Icon: LSparkles },
    { label: "Crowning Night", Icon: Crown },
  ];

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <PaperBg />
      <GoldDust count={35} opacity={0.35} />
      {/* Header */}
      <div style={{
        position: "absolute", top: 130, left: 0, right: 0,
        textAlign: "center", opacity: headerO,
      }}>
        <div style={{
          fontFamily: SANS, fontSize: 26, color: GOLD,
          letterSpacing: "0.4em", fontWeight: 500, paddingLeft: "0.4em",
        }}>THE EVENING</div>
        <div style={{
          marginTop: 16,
          fontFamily: SERIF, fontStyle: "italic", fontWeight: 600,
          fontSize: 64, color: INK, lineHeight: 1.1,
        }}>What awaits you</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <Rule width={180} delay={26} duration={20} />
        </div>
      </div>

      {/* List */}
      <AbsoluteFill style={{
        alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 22, paddingTop: 180,
      }}>
        {items.map((it, i) => {
          const s = 30 + i * 20;
          const o = interpolate(frame, [s, s + 16], [0, 1], { extrapolateRight: "clamp" });
          const x = interpolate(frame, [s, s + 22], [-40, 0], { extrapolateRight: "clamp" });
          const Icon = it.Icon;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 28,
              opacity: o, transform: `translateX(${x}px)`,
              padding: "20px 44px",
              width: 820,
              borderTop: i === 0 ? `1px solid rgba(184,146,58,0.35)` : "none",
              borderBottom: `1px solid rgba(184,146,58,0.35)`,
              background: "rgba(255,255,255,0.25)",
            }}>
              <div style={{
                width: 74, height: 74, borderRadius: "50%",
                border: `1px solid ${GOLD}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon size={40} strokeWidth={1.4} color={GOLD} />
              </div>
              <div style={{
                fontFamily: SERIF, fontStyle: "italic", fontWeight: 600,
                fontSize: 48, color: INK, letterSpacing: "0.01em",
              }}>{it.label}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ============ SCENE 6 — CTA (780–900) ============
const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoO = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const logoS = spring({ frame, fps, config: { damping: 16, stiffness: 100 } });

  const dateO = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: "clamp" });
  const locO = interpolate(frame, [40, 62], [0, 1], { extrapolateRight: "clamp" });
  const priceO = interpolate(frame, [62, 88], [0, 1], { extrapolateRight: "clamp" });
  const dmO = interpolate(frame, [92, 116], [0, 1], { extrapolateRight: "clamp" });
  const footO = interpolate(frame, [108, 130], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <PaperBg />
      <GoldDust count={55} opacity={0.6} />
      <AbsoluteFill style={{
        alignItems: "center", justifyContent: "center",
        flexDirection: "column", padding: 70,
      }}>
        <Img src={staticFile("images/logo.png")} style={{
          width: 340, opacity: logoO,
          transform: `scale(${0.8 + logoS * 0.2})`,
          filter: "drop-shadow(0 0 25px rgba(184,146,58,0.4))",
        }} />

        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginTop: 28,
          opacity: dateO,
        }}>
          <Calendar size={42} strokeWidth={1.5} color={GOLD} />
          <div style={{
            fontFamily: SERIF, fontStyle: "italic", fontWeight: 700,
            fontSize: 64, color: INK, letterSpacing: "0.01em",
          }}>Late August 2026</div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginTop: 10,
          opacity: locO,
        }}>
          <MapPin size={28} strokeWidth={1.5} color={GOLD} />
          <div style={{
            fontFamily: SANS, fontWeight: 500, fontSize: 28, color: INK,
            letterSpacing: "0.4em", paddingLeft: "0.4em",
          }}>KIGALI, RWANDA</div>
        </div>

        {/* THREE TIER CARDS — each with +1,500 RWF registration */}
        <div style={{
          marginTop: 32, opacity: priceO,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        }}>
          <div style={{
            fontFamily: SANS, fontSize: 22, color: GOLD,
            letterSpacing: "0.4em", fontWeight: 500, paddingLeft: "0.4em",
          }}>CHOOSE YOUR EVENING</div>

          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            {[
              { name: "Founder", price: 18000, accent: false },
              { name: "General", price: 25000, accent: true },
              { name: "VIP Table", price: 35000, accent: false },
            ].map((t, i) => {
              const cs = 62 + i * 8;
              const o = interpolate(frame, [cs, cs + 18], [0, 1], { extrapolateRight: "clamp" });
              const y = interpolate(frame, [cs, cs + 22], [20, 0], { extrapolateRight: "clamp" });
              const total = t.price + 1500;
              return (
                <div key={i} style={{
                  opacity: o, transform: `translateY(${y}px)`,
                  border: `${t.accent ? 2 : 1}px solid ${GOLD}`,
                  background: t.accent ? "rgba(184,146,58,0.10)" : "rgba(255,255,255,0.45)",
                  padding: "20px 18px 22px",
                  borderRadius: 4, width: 280,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                }}>
                  <div style={{
                    fontFamily: SANS, fontSize: 18, color: GOLD,
                    letterSpacing: "0.3em", fontWeight: 600, paddingLeft: "0.3em",
                    textTransform: "uppercase",
                  }}>{t.name}</div>
                  <div style={{
                    fontFamily: SERIF, fontStyle: "italic", fontWeight: 700,
                    fontSize: 46, color: INK, lineHeight: 1,
                  }}>{t.price.toLocaleString()}</div>
                  <div style={{
                    fontFamily: SANS, fontSize: 16, color: INK, opacity: 0.7,
                    letterSpacing: "0.05em",
                  }}>ticket · RWF</div>
                  <div style={{ width: 60, height: 1, background: GOLD, opacity: 0.6, margin: "6px 0" }} />
                  <div style={{
                    fontFamily: SANS, fontSize: 16, color: INK,
                  }}>+ <span style={{ color: GOLD, fontWeight: 700 }}>1,500 RWF</span> reg.</div>
                  <div style={{
                    marginTop: 6,
                    fontFamily: SERIF, fontStyle: "italic", fontWeight: 700,
                    fontSize: 24, color: INK,
                  }}>= {total.toLocaleString()} RWF</div>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: 6,
            fontFamily: SANS, fontSize: 18, color: INK, opacity: 0.65,
            letterSpacing: "0.18em", textTransform: "uppercase", paddingLeft: "0.18em",
          }}>All three ways include the 1,500 RWF registration</div>
        </div>

        <div style={{
          marginTop: 26, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600,
          fontSize: 48, color: GOLD, opacity: dmO, textAlign: "center",
          letterSpacing: "0.01em",
        }}>
          DM us to reserve your seat
        </div>

        <div style={{
          marginTop: 18, opacity: footO,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 22px", border: `1px solid ${GOLD}`,
            borderRadius: 4, background: "rgba(184,146,58,0.10)",
          }}>
            <Globe size={28} strokeWidth={1.5} color={GOLD} />
            <div style={{
              fontFamily: SANS, fontSize: 28, color: INK,
              letterSpacing: "0.08em", fontWeight: 600,
            }}>
              seniorgalakigali.sadcorporation.com
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AtSign size={26} strokeWidth={1.5} color={INK} />
            <div style={{ fontFamily: SANS, fontSize: 26, color: INK, letterSpacing: "0.12em" }}>
              sad_corp_official
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mail size={24} strokeWidth={1.5} color={INK} />
            <div style={{ fontFamily: SANS, fontSize: 24, color: INK, letterSpacing: "0.08em" }}>
              sadcorporation1@gmail.com
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ============ ROOT ============
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Sequence from={0} durationInFrames={120}><SceneHook /></Sequence>
      <Sequence from={120} durationInFrames={150}><SceneCouple /></Sequence>
      <Sequence from={270} durationInFrames={150}><ScenePromise /></Sequence>
      <Sequence from={420} durationInFrames={180}><SceneReveal /></Sequence>
      <Sequence from={600} durationInFrames={180}><SceneExperience /></Sequence>
      <Sequence from={780} durationInFrames={120}><SceneCTA /></Sequence>
    </AbsoluteFill>
  );
};