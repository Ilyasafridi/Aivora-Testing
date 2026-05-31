export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden aurora-bg">
      <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[oklch(0.82_0.16_195/0.25)] blur-3xl animate-aurora" />
      <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-[oklch(0.72_0.22_305/0.22)] blur-3xl animate-aurora" style={{ animationDelay: "-6s" }} />
      <div className="absolute -bottom-40 left-1/3 h-[32rem] w-[32rem] rounded-full bg-[oklch(0.65_0.22_250/0.22)] blur-3xl animate-aurora" style={{ animationDelay: "-12s" }} />
      {/* particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-1 w-1 rounded-full bg-[oklch(0.88_0.18_190/0.7)] animate-float"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 8) * -1.2}s`,
              animationDuration: `${6 + (i % 5)}s`,
              opacity: 0.4 + (i % 5) * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  );
}