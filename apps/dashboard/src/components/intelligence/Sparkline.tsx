export function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-6 w-16">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "var(--color-success)" : "var(--color-danger)"}
        strokeWidth={4}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
