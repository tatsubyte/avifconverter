import React, { useState } from 'react';
import { Code2, Copy, Check, ShieldCheck, Cpu, Terminal, Sparkles } from 'lucide-react';

export const PipelineDocs: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const sharpSnippet = `import sharp from 'sharp';

/**
 * Optimiza y convierte imágenes garantizando fidelidad visual y dimensiones exactas.
 * @param {Buffer} inputBuffer - Buffer de la imagen original (ej. PNG).
 * @param {'avif' | 'webp'} targetFormat - Formato de destino.
 * @param {Object} options - Parámetros de calidad y rendimiento.
 */
export async function optimizeImage(inputBuffer, targetFormat = 'webp', options = {}) {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  // Preservación estricta de dimensiones originales
  const pipeline = image.clone();

  if (targetFormat === 'webp') {
    return await pipeline
      .webp({
        quality: options.quality || 80,
        lossless: metadata.hasAlpha && options.forceLossless ? true : false,
        effort: 6, // Rango 0-6: optimización máxima de tamaño
        smartSubsample: true // Mantiene bordes nítidos en elementos UI
      })
      .toBuffer();
  }

  if (targetFormat === 'avif') {
    return await pipeline
      .avif({
        quality: options.quality || 75,
        lossless: options.forceLossless || false,
        effort: 7, // Rango 0-9: compresión eficiente para web
        chromaSubsampling: '4:4:4' // Evita pérdida de definición en contraste alto
      })
      .toBuffer();
  }

  throw new Error(\`Formato no soportado: \${targetFormat}\`);
}`;

  const curlSnippet = `curl -X POST https://your-domain.com/api/optimize \\
  -F "image=@my-image.png" \\
  -F "target_format=avif" \\
  -F "quality=75" \\
  -F "effort=7" \\
  -F "chromaSubsampling=4:4:4" \\
  --output optimized-image.avif`;

  const copyToClipboard = (text: string, type: 'code' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ARQUITECTURA DE OPTIMIZACIÓN Y FUNDAMENTOS TÉCNICOS
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          El motor OptiMatrix implementa un esquema algorítmico de compresión diferencial que
          garantiza la integridad matemática de cada imagen. Ningún archivo sufre distorsión de
          dimensiones, artefactos de bloque ni bleeding de canal alfa.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5 mb-1.5">
              <Cpu className="w-4 h-4" /> Matriz 1:1 Invariable
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Bajo ninguna circunstancia se interpolan o reescalan los píxeles de origen. El ancho y alto de destino coinciden exactamente con la entrada original para evitar emborronamiento subpíxel.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-4 h-4" /> Umbral Perceptual Q &ge; 75
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Si el peso máximo exigido requeriría bajar la calidad por debajo de 75 (lo que produciría pixelado evidente en AV1 o WebP), el motor prioriza la calidad visual, fija la calidad en &ge; 75 y marca el estado como <code className="text-amber-300">COMPROMISED</code>.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-4 h-4" /> Chroma 4:4:4 & Subsample
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              En AVIF se impone <code className="text-indigo-300">chromaSubsampling: 4:4:4</code> para preservar la resolución cromática completa en elementos UI con alto contraste, mientras en WebP se activa <code className="text-indigo-300">smartSubsample</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Code Snippet Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span className="font-mono font-bold text-slate-200">
              LÓGICA BASE EN SHARP (Node.js / TypeScript)
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(sharpSnippet, 'code')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Copiado' : 'Copiar Función Sharp'}
          </button>
        </div>

        <div className="p-4 bg-slate-950/90 overflow-x-auto">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            {sharpSnippet}
          </pre>
        </div>
      </div>

      {/* API cURL Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-bold text-slate-200">
              API REST ENDPOINT (/api/optimize)
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(curlSnippet, 'curl')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCurl ? 'Copiado' : 'Copiar cURL'}
          </button>
        </div>

        <div className="p-4 bg-slate-950/90 overflow-x-auto">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
            {curlSnippet}
          </pre>
        </div>
      </div>
      {/* Sección sutil de Agradecimiento y Soporte */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          <span className="font-mono text-slate-300 font-semibold block">
            Proyecto Libre y Gratuito
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Desarrollado para optimizar repositorios sin perder calidad. Si esta herramienta te ahorró tiempo, puedes apoyar su mantenimiento.
          </p>
        </div>
        <a
          href="https://ko-fi.com/tatsubyte"
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-amber-300 rounded-lg text-xs font-mono transition-colors"
        >
          ☕ Invitar un café
        </a>
      </div>
    </div>
  );
};
