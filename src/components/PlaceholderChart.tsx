interface PlaceholderChartProps {
  label?: string;
  height?: number;
  className?: string;
}

export default function PlaceholderChart({
  label = "Chart — available after question is answered",
  height = 200,
  className = "",
}: PlaceholderChartProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-600 bg-gray-900/50",
        className,
      ].join(" ")}
      style={{ minHeight: height }}
    >
      {/* Fake bar chart silhouette */}
      <div className="flex items-end gap-2 mb-3 opacity-20">
        {[40, 70, 55, 90, 35, 65].map((h, i) => (
          <div
            key={i}
            className="w-6 rounded-t bg-blue-400"
            style={{ height: h }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 text-center px-4">{label}</p>
    </div>
  );
}
