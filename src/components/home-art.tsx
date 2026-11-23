// Drawings for the home page: a sunny hillside with sheep (a night sky in dark mode) and the activity icons.
// Plain vector shapes, so they stay sharp on any screen.

function Sheep({ x, y, s = 1, flip = false, bob = 0 }: { x: number; y: number; s?: number; flip?: boolean; bob?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <g className="ha-bob" style={{ animationDelay: `${bob}s` }}>
        <ellipse cx="0" cy="34" rx="30" ry="5" className="ha-shadow" />
        <rect x="-17" y="12" width="6" height="20" rx="3" className="ha-ink" />
        <rect x="9" y="12" width="6" height="20" rx="3" className="ha-ink" />
        <g className="ha-wool">
          <circle cx="-16" cy="2" r="13" /><circle cx="0" cy="-6" r="15" /><circle cx="16" cy="0" r="13" />
          <circle cx="-8" cy="12" r="13" /><circle cx="10" cy="12" r="13" /><circle cx="0" cy="4" r="16" />
        </g>
        <g transform="translate(-27 -2)">
          <ellipse cx="0" cy="0" rx="11" ry="13" className="ha-ink" />
          <ellipse cx="-9" cy="-8" rx="7" ry="4" transform="rotate(-25 -9 -8)" className="ha-ink" />
          <ellipse cx="9" cy="-9" rx="7" ry="4" transform="rotate(25 9 -9)" className="ha-ink" />
          <circle cx="-4" cy="-2" r="2.6" fill="#fff" /><circle cx="4" cy="-2" r="2.6" fill="#fff" />
          <circle cx="-4" cy="-1.6" r="1.3" className="ha-ink" /><circle cx="4" cy="-1.6" r="1.3" className="ha-ink" />
          <circle cx="-6.5" cy="4" r="2.2" className="ha-cheek" /><circle cx="6.5" cy="4" r="2.2" className="ha-cheek" />
        </g>
        <circle cx="-22" cy="-14" r="6" className="ha-wool-top" />
      </g>
    </g>
  );
}

const Cloud = ({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className="ha-cloud" style={{ animationDelay: `${d}s` }}>
      <ellipse cx="0" cy="10" rx="42" ry="14" /><circle cx="-16" cy="2" r="16" /><circle cx="8" cy="-4" r="20" /><circle cx="26" cy="6" r="12" />
    </g>
  </g>
);

const Flower = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="-1" y="0" width="2" height="12" rx="1" className="ha-stem" />
    {[0, 72, 144, 216, 288].map(a => <circle key={a} cx={Math.cos(a * Math.PI / 180) * 4.5} cy={Math.sin(a * Math.PI / 180) * 4.5} r="3.6" fill={c} />)}
    <circle r="2.6" fill="#FFD966" />
  </g>
);

export function HillsArt() {
  return (
    <svg className="home-art" viewBox="0 0 560 400" role="img" aria-label="Sheep resting on green hills under a bright sun">
      <defs>
        <radialGradient id="ha-glow"><stop offset="0" className="ha-glow-in" /><stop offset="1" className="ha-glow-out" /></radialGradient>
        <linearGradient id="ha-hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="ha-h1a" /><stop offset="1" className="ha-h1b" /></linearGradient>
        <linearGradient id="ha-hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="ha-h2a" /><stop offset="1" className="ha-h2b" /></linearGradient>
        <linearGradient id="ha-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="ha-sky-a" /><stop offset="1" className="ha-sky-b" /></linearGradient>
        <clipPath id="ha-frame"><rect width="560" height="400" rx="44" /></clipPath>
        <mask id="ha-crescent"><rect x="380" y="30" width="130" height="130" fill="#fff" /><circle cx="464" cy="74" r="40" fill="#000" /></mask>
      </defs>
      <g clipPath="url(#ha-frame)">
      <rect width="560" height="400" fill="url(#ha-sky)" />
      {/* sun by day, moon and stars by night */}
      <circle cx="440" cy="92" r="96" fill="url(#ha-glow)" />
      <g className="ha-sun"><g className="ha-rays">{Array.from({ length: 12 }, (_, i) => <rect key={i} x="-3.5" y="-78" width="7" height="18" rx="3.5" transform={`rotate(${i * 30})`} />)}</g><circle r="50" /></g>
      <g className="ha-moon"><circle cx="440" cy="92" r="44" mask="url(#ha-crescent)" /></g>
      <g className="ha-stars">{[[60, 50], [130, 26], [210, 70], [300, 34], [360, 120], [500, 190], [30, 140], [520, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 2.2 : 3.2} style={{ animationDelay: `${i * .4}s` }} />)}</g>
      <Cloud x={120} y={78} s={1.1} /><Cloud x={300} y={150} s={.8} d={-6} /><Cloud x={40} y={190} s={.6} d={-12} />
      {/* hills */}
      <path d="M-20 300 C 80 220, 200 230, 290 280 S 470 250, 580 220 L 580 420 L -20 420 Z" fill="url(#ha-hill1)" />
      <path d="M-20 340 C 90 290, 220 300, 320 330 S 500 320, 580 290 L 580 420 L -20 420 Z" fill="url(#ha-hill2)" />
      <path d="M250 420 C 280 380, 330 360, 420 345" className="ha-path" />
      <Flower x={70} y={340} c="#F2654E" /><Flower x={110} y={360} c="#C2407E" /><Flower x={470} y={330} c="#7B5CD6" /><Flower x={520} y={350} c="#F2654E" /><Flower x={300} y={375} c="#2F9BE0" />
      <Sheep x={160} y={300} s={1.7} bob={0} />
      <Sheep x={400} y={292} s={1.35} flip bob={-1.2} />
      <Sheep x={282} y={338} s={1} bob={-.6} />
      </g>
      <rect x="1.5" y="1.5" width="557" height="397" rx="43" className="ha-edge" />
    </svg>
  );
}

/** Round, colourful icons for the "what you can do" row. */
export function ActIcon({ kind }: { kind: "questions" | "verse" | "map" | "badges" }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      {kind === "questions" && <><rect x="6" y="4" width="20" height="24" rx="4" {...p} /><path d="M11 11h10M11 16h10M11 21h6" {...p} /></>}
      {kind === "verse" && <><path d="M16 8c-3-2.5-7-3-10-2.5v19c3-.5 7 0 10 2.5 3-2.5 7-3 10-2.5v-19c-3-.5-7 0-10 2.5ZM16 8v19" {...p} /></>}
      {kind === "map" && <><path d="M4 8l8-3 8 3 8-3v19l-8 3-8-3-8 3Z M12 5v19M20 8v19" {...p} /></>}
      {kind === "badges" && <><circle cx="16" cy="12" r="7" {...p} /><path d="M11.5 17.5 9 28l7-3.5 7 3.5-2.5-10.5" {...p} /><path d="m13.5 12 2 2 3.5-4" {...p} /></>}
    </svg>
  );
}
