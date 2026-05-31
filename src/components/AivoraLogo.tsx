export function AivoraLogo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-2xl glass neon-glow animate-pulse-glow"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none">
        <defs>
          <linearGradient id="aivg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.88 0.18 190)" />
            <stop offset="100%" stopColor="oklch(0.72 0.22 305)" />
          </linearGradient>
        </defs>
        <path
          d="M12 2 L20 20 H16 L14.5 16.5 H9.5 L8 20 H4 Z M10.5 13.5 H13.5 L12 9.5 Z"
          fill="url(#aivg)"
        />
      </svg>
    </div>
  );
}