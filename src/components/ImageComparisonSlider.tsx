import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Eye, Check, AlertTriangle, Download } from 'lucide-react';

interface Props {
  originalSrc: string;
  optimizedSrc: string | null;
  originalLabel: string;
  optimizedLabel: string;
  hasAlpha?: boolean;
  isProcessing?: boolean;
  onDownload?: () => void;
  format?: string;
}

export const ImageComparisonSlider: React.FC<Props> = ({
  originalSrc,
  optimizedSrc,
  originalLabel,
  optimizedLabel,
  hasAlpha = false,
  isProcessing = false,
  onDownload,
  format = 'WEBP',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState<number>(1);
  const [showCheckerboard, setShowCheckerboard] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const checkerboardStyle = showCheckerboard
    ? {
        backgroundImage: `
          linear-gradient(45deg, #1e293b 25%, transparent 25%), 
          linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #1e293b 75%), 
          linear-gradient(-45deg, transparent 75%, #1e293b 75%)
        `,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        backgroundColor: '#0f172a',
      }
    : { backgroundColor: '#020617' };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs text-slate-300 gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> INSPECTOR VISUAL 1:1
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            {originalLabel} <span className="text-slate-600">vs</span> {optimizedLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'split' ? 'bg-slate-800 text-sky-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split Slider
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-slate-800 text-sky-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Side-by-Side
            </button>
          </div>

          {/* Checkerboard toggle */}
          <button
            onClick={() => setShowCheckerboard(!showCheckerboard)}
            title="Alternar fondo cuadriculado para canal alfa"
            className={`px-2.5 py-1 rounded border text-xs transition-colors ${
              showCheckerboard
                ? 'bg-slate-800 border-sky-500/30 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            Grid Alfa
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.5))}
              disabled={zoom <= 1}
              className="p-1 hover:text-white disabled:opacity-30"
              title="Reducir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs w-9 text-center text-slate-300 font-semibold">{zoom}x</span>
            <button
              onClick={() => setZoom(Math.min(4, zoom + 0.5))}
              disabled={zoom >= 4}
              className="p-1 hover:text-white disabled:opacity-30"
              title="Aumentar Zoom (Inspección de artefactos)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {optimizedSrc && onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Descargar {format}
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="relative w-full h-[400px] md:h-[480px] overflow-auto select-none"
        style={checkerboardStyle}
      >
        {viewMode === 'split' ? (
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="relative w-full h-full cursor-ew-resize overflow-hidden flex items-center justify-center"
          >
            {/* Original image (Background layer) */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              {originalSrc ? (
                <img
                  src={originalSrc}
                  alt="Original"
                  className="max-h-full max-w-full object-contain"
                  style={{ imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
                />
              ) : null}
            </div>

            {/* Optimized image (Clipped foreground layer) */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform"
              style={{
                clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              {optimizedSrc ? (
                <img
                  src={optimizedSrc}
                  alt="Optimizado"
                  className="max-h-full max-w-full object-contain"
                  style={{ imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-slate-400">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono text-xs">Ejecutando pipeline Sharp...</span>
                    </div>
                  ) : (
                    <p className="font-mono text-xs text-center px-4">
                      Presiona "Ejecutar Pipeline Sharp" para generar el buffer binario optimizado
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Slider Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] pointer-events-none z-20"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-sky-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white">
                <span className="text-[10px] font-bold">↔</span>
              </div>
            </div>

            {/* Badges in split mode */}
            <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-black/75 backdrop-blur border border-white/10 rounded text-[11px] font-mono text-slate-200">
              ORIGINAL (Legacy)
            </div>
            <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-sky-950/80 backdrop-blur border border-sky-500/30 rounded text-[11px] font-mono text-sky-300">
              OPTIMIZADO ({format})
            </div>
          </div>
        ) : (
          /* Side by side view */
          <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Original */}
            <div className="relative p-4 flex flex-col items-center justify-center overflow-hidden">
              <span className="absolute top-3 left-3 z-10 px-2 py-1 bg-black/75 border border-white/10 rounded text-[11px] font-mono text-slate-300">
                ORIGINAL · {originalLabel}
              </span>
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              >
                <img
                  src={originalSrc}
                  alt="Original"
                  className="max-h-full max-w-full object-contain"
                  style={{ imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
                />
              </div>
            </div>

            {/* Optimized */}
            <div className="relative p-4 flex flex-col items-center justify-center overflow-hidden">
              <span className="absolute top-3 left-3 z-10 px-2 py-1 bg-sky-950/80 border border-sky-500/30 rounded text-[11px] font-mono text-sky-300">
                OPTIMIZADO ({format}) · {optimizedLabel}
              </span>
              {optimizedSrc ? (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                >
                  <img
                    src={optimizedSrc}
                    alt="Optimizado"
                    className="max-h-full max-w-full object-contain"
                    style={{ imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
                  {isProcessing ? 'Procesando en Sharp...' : 'Sin procesar todavía'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <Check className="w-3.5 h-3.5" /> Matriz 1:1 Preservada
          </span>
          {hasAlpha && (
            <span className="flex items-center gap-1 text-sky-400">
              <Check className="w-3.5 h-3.5" /> Canal Alfa Mapeado (Sin Halo)
            </span>
          )}
        </div>
        <div className="font-mono text-slate-500">
          Inspección a {zoom}x · Calidad visual garantizada
        </div>
      </div>
    </div>
  );
};
