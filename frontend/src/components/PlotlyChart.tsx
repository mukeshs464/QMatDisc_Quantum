import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";
import { Download } from "lucide-react";

interface PlotlyChartProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
  chartId?: string;
  enableExport?: boolean;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout = {},
  config = {},
  className = "w-full h-80",
  chartId = "plotly-chart",
  enableExport = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const defaultLayout: any = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: {
      family: "Inter, sans-serif",
      color: "#E6EDF7",
      size: 11,
    },
    margin: { l: 55, r: 25, t: 35, b: 45 },
    xaxis: {
      gridcolor: "#1E2B44",
      zerolinecolor: "#2A3C5E",
      tickfont: { color: "#9FB3CC", size: 10 },
      ...(layout.xaxis || {}),
    },
    yaxis: {
      gridcolor: "#1E2B44",
      zerolinecolor: "#2A3C5E",
      tickfont: { color: "#9FB3CC", size: 10 },
      ...(layout.yaxis || {}),
    },
    legend: {
      bgcolor: "rgba(17, 27, 48, 0.8)",
      bordercolor: "#1E2B44",
      borderwidth: 1,
      font: { color: "#E6EDF7", size: 10 },
      ...(layout.legend || {}),
    },
    hoverlabel: {
      bgcolor: "#111B30",
      bordercolor: "#22D3EE",
      font: { color: "#E6EDF7", family: "JetBrains Mono" },
    },
    autosize: true,
    ...layout,
  };

  const defaultConfig: any = {
    responsive: true,
    displayModeBar: false,
    ...config,
  };

  useEffect(() => {
    if (!containerRef.current) return;
    Plotly.react(containerRef.current, data, defaultLayout, defaultConfig);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, layout]);

  const handleExportPNG = () => {
    if (!containerRef.current) return;
    Plotly.downloadImage(containerRef.current, {
      format: "png",
      width: 1200,
      height: 700,
      filename: `${chartId}-${new Date().toISOString().slice(0, 10)}`,
    });
  };

  return (
    <div className="relative group">
      {enableExport && (
        <button
          onClick={handleExportPNG}
          title="Export Chart as High-Res PNG"
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-space-card/80 border border-space-border text-space-muted hover:text-space-text hover:border-quantum-cyan/50 opacity-0 group-hover:opacity-100 transition-all text-xs flex items-center gap-1 shadow-lg"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PNG</span>
        </button>
      )}
      <div ref={containerRef} className={className} id={chartId} />
    </div>
  );
};
