import React, { useState } from 'react';
import { Layers, Zap, Database, Globe, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { TargetFormat } from '../types/optimizer';

interface RepoAsset {
  filename: string;
  type: string;
  dimensions: string;
  originalKb: number;
  targetFormat: TargetFormat;
  estimatedKb: number;
  status: 'PASS' | 'COMPROMISED';
  reason?: string;
}

const DEFAULT_REPO_ASSETS: RepoAsset[] = [
  {
    filename: 'hero-banner-app.png',
    type: 'UI Element',
    dimensions: '1920x1080',
    originalKb: 1250,
    targetFormat: 'AVIF',
    estimatedKb: 182.4,
    status: 'COMPROMISED',
    reason: 'Límite de 150KB inferior al umbral de seguridad; calidad mantenida en 75',
  },
  {
    filename: 'product-photometry.jpg',
    type: 'Photography',
    dimensions: '2560x1440',
    originalKb: 2840,
    targetFormat: 'AVIF',
    estimatedKb: 418.0,
    status: 'PASS',
  },
  {
    filename: 'nav-logo-alpha.png',
    type: 'Graphic with Alpha Channel',
    dimensions: '600x200',
    originalKb: 185,
    targetFormat: 'WebP',
    estimatedKb: 28.5,
    status: 'PASS',
  },
  {
    filename: 'analytics-dashboard-preview.png',
    type: 'UI Element',
    dimensions: '1440x900',
    originalKb: 920,
    targetFormat: 'AVIF',
    estimatedKb: 135.2,
    status: 'PASS',
  },
  {
    filename: 'avatar-user-badge.png',
    type: 'Graphic with Alpha Channel',
    dimensions: '256x256',
    originalKb: 140,
    targetFormat: 'WebP',
    estimatedKb: 16.4,
    status: 'PASS',
  },
  {
    filename: 'footer-brand-texture.png',
    type: 'Illustration',
    dimensions: '1920x400',
    originalKb: 780,
    targetFormat: 'AVIF',
    estimatedKb: 98.0,
    status: 'PASS',
  },
];

export const BatchSimulator: React.FC = () => {
  const [monthlyPageviews, setMonthlyPageviews] = useState<number>(250000);
  const [cdnCostPerGb, setCdnCostPerGb] = useState<number>(0.08); // $0.08 per GB standard Cloud CDN

  const totalOriginalKb = DEFAULT_REPO_ASSETS.reduce((acc, curr) => acc + curr.originalKb, 0);
  const totalOptimizedKb = DEFAULT_REPO_ASSETS.reduce((acc, curr) => acc + curr.estimatedKb, 0);
  const totalSavedKb = totalOriginalKb - totalOptimizedKb;
  const reductionPercent = Math.round((totalSavedKb / totalOriginalKb) * 100);

  // Bandwidth calculation in GB per month
  const originalMonthlyGb = (totalOriginalKb * monthlyPageviews) / (1024 * 1024);
  const optimizedMonthlyGb = (totalOptimizedKb * monthlyPageviews) / (1024 * 1024);
  const savedMonthlyGb = originalMonthlyGb - optimizedMonthlyGb;
  const monthlyCostSavings = Math.round(savedMonthlyGb * cdnCostPerGb * 100) / 100;

  // LCP estimation (assuming 4G 15 Mbps with 40ms RTT)
  const lcpOriginalMs = Math.round((DEFAULT_REPO_ASSETS[0].originalKb / (15 * 1024 / 8)) * 1000 + 40);
  const lcpOptimizedMs = Math.round((DEFAULT_REPO_ASSETS[0].estimatedKb / (15 * 1024 / 8)) * 1000 + 40);
  const lcpSpeedupMs = lcpOriginalMs - lcpOptimizedMs;

  return (
    <div className="flex flex-col gap-6">
      {/* Intro banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" /> SIMULADOR DE REPOSITORIO WEB & IMPACTO EN PRODUCCIÓN
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Proyección técnica de ancho de banda, tiempos LCP y ahorro en CDN al ejecutar el pipeline OptiMatrix en todo el repositorio.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-lg text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px]">PÁGINAS VISTAS / MES</span>
            <input
              type="number"
              value={monthlyPageviews}
              onChange={(e) => setMonthlyPageviews(Math.max(1000, parseInt(e.target.value) || 1000))}
              className="bg-transparent text-sky-400 font-bold focus:outline-none w-28"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reduction % */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>REDUCCIÓN DE PESO</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">-{reductionPercent}%</div>
            <div className="text-xs text-slate-400 mt-1">
              De {(totalOriginalKb / 1024).toFixed(2)} MB a {(totalOptimizedKb / 1024).toFixed(2)} MB
            </div>
          </div>
        </div>

        {/* LCP Improvement */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>VELOCIDAD LCP (4G MÓVIL)</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-sky-400 font-mono">-{lcpSpeedupMs}ms</div>
            <div className="text-xs text-slate-400 mt-1">
              {lcpOriginalMs}ms → {lcpOptimizedMs}ms en Hero Banner
            </div>
          </div>
        </div>

        {/* Bandwidth saved */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>TRÁFICO AHORRADO</span>
            <Globe className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-indigo-400 font-mono">
              {savedMonthlyGb.toFixed(0)} GB<span className="text-base text-slate-400 font-normal">/mes</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Tasa de transferencia reducida 1:1
            </div>
          </div>
        </div>

        {/* CDN Cost Savings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>AHORRO EGRESS CDN</span>
            <span className="text-xs text-emerald-400 font-mono font-bold">ROI DIRECTO</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-400 font-mono">
              ${monthlyCostSavings.toFixed(2)}<span className="text-base text-slate-400 font-normal">/mes</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Estimado a ${cdnCostPerGb}/GB egress
            </div>
          </div>
        </div>
      </div>

      {/* Asset table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-slate-300">
            AUDITORÍA DE ACTIVOS DE LA MUESTRA DEL REPOSITORIO
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {DEFAULT_REPO_ASSETS.length} activos evaluados · Cero pixelado garantizado
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Archivo / Recurso</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Dimensiones 1:1</th>
                <th className="px-4 py-3">Original</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Optimizado</th>
                <th className="px-4 py-3">Ahorro</th>
                <th className="px-4 py-3">Estado Integridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {DEFAULT_REPO_ASSETS.map((asset, idx) => {
                const saving = Math.round(((asset.originalKb - asset.estimatedKb) / asset.originalKb) * 100);
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {asset.filename}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{asset.type}</td>
                    <td className="px-4 py-3 text-emerald-400">{asset.dimensions}</td>
                    <td className="px-4 py-3 text-slate-300">{asset.originalKb} KB</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 text-[11px] font-bold">
                        {asset.targetFormat}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sky-300 font-bold">{asset.estimatedKb} KB</td>
                    <td className="px-4 py-3 text-emerald-400">-{saving}%</td>
                    <td className="px-4 py-3">
                      {asset.status === 'PASS' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-bold cursor-help"
                          title={asset.reason}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> COMPROMISED*
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
          <span>* COMPROMISED: Se prioriza la integridad visual de 75 Q sobre el límite forzado de peso para evitar artefactos visibles.</span>
          <span>Regla de cero pixelación activa</span>
        </div>
      </div>
    </div>
  );
};
