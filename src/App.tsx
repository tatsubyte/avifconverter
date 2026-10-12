import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cpu,
  Layers,
  FileCode,
  Sliders,
  Upload,
  Download,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Code,
  Shield,
  ArrowRight,
  Info,
  Maximize2,
  FileImage,
  Sparkles,
} from 'lucide-react';

import {
  OriginData,
  TargetRequirements,
  ImageContentType,
  TargetFormat,
  OptimizationExecutionResult,
} from './types/optimizer';
import { computeOptimizationPlan } from './utils/engine';
import { SAMPLE_PRESETS, generateSyntheticImage } from './utils/presets';
import { ImageComparisonSlider } from './components/ImageComparisonSlider';
import { XmlEditor } from './components/XmlEditor';
import { BatchSimulator } from './components/BatchSimulator';
import { PipelineDocs } from './components/PipelineDocs';
import { translations, Language } from './utils/translations';
import { optimizeImageInBrowser } from './utils/clientOptimizer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'spec' | 'batch' | 'docs'>('studio');
const [lang, setLang] = useState<Language>('es');
const t = translations[lang];
const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  // Estado del caso actual (inicializado con el caso de ejemplo del prompt)
  const [selectedPresetId, setSelectedPresetId] = useState<string>('user_prompt_case');
  const [origin, setOrigin] = useState<OriginData>(SAMPLE_PRESETS[0].origin);
  const [target, setTarget] = useState<TargetRequirements>(SAMPLE_PRESETS[0].target);

  // Modo de edición de parámetros: 'controls' o 'xml'
  const [inputMode, setInputMode] = useState<'controls' | 'xml'>('controls');

  // Imágenes en memoria
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [optimizedResult, setOptimizedResult] = useState<OptimizationExecutionResult | null>(null);
  const [isProcessingSharp, setIsProcessingSharp] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Feedback de copiado
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedReasoning, setCopiedReasoning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar imagen sintética inicial al montar
  useEffect(() => {
    // Mensaje para desarrolladores que inspeccionan la consola
    console.log(
      '%c AVIFconverter %c Creado para optimizar la web con precisión y agilizar la entrega de activos en repositorios. Gracias por revisar el código.',
      'background: #0284c7; color: #fff; font-weight: bold; padding: 3px 6px; border-radius: 4px;',
      'color: #94a3b8; font-family: monospace;'
    );

    generateSyntheticImage(selectedPresetId).then((dataUrl) => {
      setOriginalImageSrc(dataUrl);
    });
  }, []);

  // Calcular plan matemático en tiempo real
  const engineResult = useMemo(() => {
    try {
      return computeOptimizationPlan(origin, target);
    } catch (err: any) {
      return null;
    }
  }, [origin, target]);

  // Manejo de cambio de preset
  const handleSelectPreset = async (presetId: string) => {
    const preset = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setOrigin(preset.origin);
    setTarget(preset.target);
    setOptimizedResult(null);
    setServerError(null);

    const syntheticUrl = await generateSyntheticImage(presetId);
    setOriginalImageSrc(syntheticUrl);
  };

  // Manejo de carga de archivo real por el usuario
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setSelectedPresetId('custom_upload');
    setOptimizedResult(null);
    setServerError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      setOriginalImageSrc(dataUrl);

      // Metadatos inmediatos en cliente para garantizar que la página NUNCA se congele o quede en blanco
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || 1920;
        const height = img.naturalHeight || 1080;
        const rawExt = file.name.split('.').pop()?.toUpperCase() || '';
        const detectedFormat = ['PNG', 'JPEG', 'JPG', 'WEBP', 'BMP'].includes(rawExt)
          ? rawExt === 'JPG'
            ? 'JPEG'
            : rawExt
          : file.type.includes('png')
            ? 'PNG'
            : file.type.includes('webp')
              ? 'WEBP'
              : 'JPEG';
        const weightKb = Math.round((file.size / 1024) * 10) / 10;
        const isPngOrAlpha = detectedFormat === 'PNG' || detectedFormat === 'WEBP';

        setOrigin({
          current_format: detectedFormat,
          current_weight_kb: weightKb,
          width_px: width,
          height_px: height,
          content_type: isPngOrAlpha ? 'UI Element' : 'Photography',
        });
      };
      img.src = dataUrl;

      // Si el archivo es menor a 2.5MB, consultar al servidor para enriquecer metadatos (espacio cromático, densidad)
      if (file.size <= 2.5 * 1024 * 1024) {
        try {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: dataUrl,
            }),
          });

          if (res.ok) {
            const meta = await res.json();
            if (meta.width && meta.height) {
              setOrigin((prev) => ({
                ...prev,
                current_format: meta.format || prev.current_format,
                content_type: (meta.contentType as ImageContentType) || prev.content_type,
              }));
            }
          }
        } catch (err) {
          // El cliente ya tiene las dimensiones exactas, no bloquea al usuario
          console.debug('Metadata server ping skipped:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Ejecutar pipeline real de optimización garantizando cero pixelación y compatibilidad con cualquier tamaño de archivo
  const handleExecuteSharpPipeline = async () => {
    if (!engineResult) return;
    if (!originalImageSrc) {
      setServerError('No hay ninguna imagen cargada para optimizar.');
      return;
    }

    setIsProcessingSharp(true);
    setServerError(null);

    const params = engineResult.plan.transformation_plan.encoder_parameters;
    const targetFormat = target.target_format;
    const base64Bytes = originalImageSrc.length * 0.75;
    // Vercel Serverless Function tiene un límite estricto de 4.5MB en AWS Lambda
    const exceedsVercelPayloadLimit = base64Bytes > 3.5 * 1024 * 1024;

    try {
      if (exceedsVercelPayloadLimit) {
        // Ejecución en cliente de alta fidelidad sin restricciones de tamaño
        const clientResult = await optimizeImageInBrowser(
          originalImageSrc,
          targetFormat,
          params.quality,
          params.preserve_alpha
        );
        const origKb = origin.current_weight_kb || Math.round((base64Bytes / 1024) * 10) / 10;
        const reduction =
          Math.round(((origKb - clientResult.output.weight_kb) / origKb) * 10000) / 100;
        clientResult.reduction_percent = Math.max(0, reduction);
        clientResult.original = {
          width: origin.width_px,
          height: origin.height_px,
          weight_kb: origKb,
          format: origin.current_format,
          hasAlpha: params.preserve_alpha,
        };
        setOptimizedResult(clientResult);
        return;
      }

      // Archivo dentro de límites de Vercel: intentar optimización nativa con Sharp
      const payload = {
        imageBase64: originalImageSrc,
        targetFormat: targetFormat.toLowerCase(),
        quality: params.quality,
        forceLossless: params.lossless,
        effort: params.effort_level,
        chromaSubsampling: targetFormat === 'AVIF' ? '4:4:4' : undefined,
      };

      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data: OptimizationExecutionResult = await response.json();
        setOptimizedResult(data);
      } else {
        // Si Vercel devuelve 413, 400 u otro error, fallback automático al motor de cliente de alta fidelidad
        console.warn(
          `Respuesta ${response.status} del servidor Vercel. Activando motor de alta fidelidad en cliente...`
        );
        const clientResult = await optimizeImageInBrowser(
          originalImageSrc,
          targetFormat,
          params.quality,
          params.preserve_alpha
        );
        const origKb = origin.current_weight_kb || Math.round((base64Bytes / 1024) * 10) / 10;
        const reduction =
          Math.round(((origKb - clientResult.output.weight_kb) / origKb) * 10000) / 100;
        clientResult.reduction_percent = Math.max(0, reduction);
        clientResult.original = {
          width: origin.width_px,
          height: origin.height_px,
          weight_kb: origKb,
          format: origin.current_format,
          hasAlpha: params.preserve_alpha,
        };
        setOptimizedResult(clientResult);
      }
    } catch (err: any) {
      console.warn('Fallo en petición de servidor, ejecutando motor en cliente:', err);
      try {
        const clientResult = await optimizeImageInBrowser(
          originalImageSrc,
          targetFormat,
          params.quality,
          params.preserve_alpha
        );
        const origKb = origin.current_weight_kb || Math.round((base64Bytes / 1024) * 10) / 10;
        const reduction =
          Math.round(((origKb - clientResult.output.weight_kb) / origKb) * 10000) / 100;
        clientResult.reduction_percent = Math.max(0, reduction);
        clientResult.original = {
          width: origin.width_px,
          height: origin.height_px,
          weight_kb: origKb,
          format: origin.current_format,
          hasAlpha: params.preserve_alpha,
        };
        setOptimizedResult(clientResult);
      } catch (clientErr: any) {
        setServerError(clientErr.message || 'Error al procesar la imagen.');
      }
    } finally {
      setIsProcessingSharp(false);
    }
  };

  // Descargar la imagen optimizada producida por Sharp
  const handleDownloadOptimized = () => {
    if (!optimizedResult?.imageBase64) return;
    const a = document.createElement('a');
    a.href = optimizedResult.imageBase64;
    const ext = target.target_format.toLowerCase();
    a.download = `AVIFconverter-${origin.width_px}x${origin.height_px}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyJson = () => {
    if (!engineResult) return;
    navigator.clipboard.writeText(engineResult.json_output);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyReasoning = () => {
    if (!engineResult) return;
    navigator.clipboard.writeText(engineResult.espacio_de_trabajo);
    setCopiedReasoning(true);
    setTimeout(() => setCopiedReasoning(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white font-mono">
                  AVIFconverter
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/50 text-[10px] font-mono uppercase font-semibold">
                  Sharp v0.34 Core
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                Advanced Web Image Processing & Codec Optimization Engine
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'studio'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Studio Vivo
            </button>
            <button
              onClick={() => setActiveTab('spec')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'spec'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> Razón & JSON
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'batch'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Auditor Repositorio
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'docs'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Docs Sharp
            </button>
          </nav>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono ml-2">
              <button
                onClick={() => setLang('es')}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === 'es' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                ES
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === 'en' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Presets Quick Strip */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-[11px] font-mono text-slate-500 uppercase whitespace-nowrap pl-1">
            CASOS DE PRUEBA:
          </span>
          {SAMPLE_PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                  isSelected
                    ? 'bg-sky-950 border-sky-500/60 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {p.id === 'user_prompt_case' ? '★ ' : ''}
                {p.name.split(' (')[0]}
              </button>
            );
          })}
        </div>

        {/* TAB 1: STUDIO */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Input and Parameters (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Card de Configuración de Entrada */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2.5">
                    <Sliders className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
  {t.matrixTitle}
                      </h2>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
  {t.matrixSubtitle}
</p>
                    </div>
                  </div>

                  {/* Toggle Controls vs XML */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                    <button
                      onClick={() => setInputMode('controls')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        inputMode === 'controls'
                          ? 'bg-slate-800 text-sky-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Formulario
                    </button>
                    <button
                      onClick={() => setInputMode('xml')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        inputMode === 'xml'
                          ? 'bg-slate-800 text-sky-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      XML Raw
                    </button>
                  </div>
                </div>

                {/* Subir archivo real o alternar */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-sky-500 rounded-lg text-xs font-mono text-slate-300 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    {t.uploadBtn}
                  </button>
                </div>

                {uploadedFileName && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-xs font-mono text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Listo: <strong>{uploadedFileName}</strong></span>
                  </div>
                )}

                {inputMode === 'xml' ? (
                  <XmlEditor
                    origin={origin}
                    target={target}
                    onSyncXml={(newOrigin, newTarget) => {
                      setOrigin(newOrigin);
                      setTarget(newTarget);
                      setOptimizedResult(null);
                    }}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* ORIGIN PARAMETERS */}
                    <div className="border border-slate-800/80 bg-slate-950/60 rounded-lg p-3.5 flex flex-col gap-3">
                      <div className="text-[11px] font-mono text-sky-400 font-semibold flex items-center justify-between">
                        <span>&lt;datos_origen&gt;</span>
                        <span className="text-slate-500">Lectura 1:1</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">
                            &lt;formato_actual&gt;
                          </label>
                          <select
                            value={origin.current_format}
                            onChange={(e) =>
                              setOrigin({ ...origin, current_format: e.target.value.toUpperCase() })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                          >
                            <option value="PNG">PNG</option>
                            <option value="JPEG">JPEG</option>
                            <option value="WEBP">WEBP</option>
                            <option value="BMP">BMP</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">
                            &lt;peso_actual_kb&gt;
                          </label>
                          <input
                            type="number"
                            value={origin.current_weight_kb}
                            onChange={(e) =>
                              setOrigin({
                                ...origin,
                                current_weight_kb: Math.max(1, parseFloat(e.target.value) || 1),
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">
                            &lt;ancho_px&gt; (Inalterable)
                          </label>
                          <input
                            type="number"
                            value={origin.width_px}
                            onChange={(e) =>
                              setOrigin({
                                ...origin,
                                width_px: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">
                            &lt;alto_px&gt; (Inalterable)
                          </label>
                          <input
                            type="number"
                            value={origin.height_px}
                            onChange={(e) =>
                              setOrigin({
                                ...origin,
                                height_px: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 font-mono">
                          &lt;tipo_contenido&gt;
                        </label>
                        <select
                          value={origin.content_type}
                          onChange={(e) =>
                            setOrigin({
                              ...origin,
                              content_type: e.target.value as ImageContentType,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                        >
                          <option value="UI Element">UI Element (Interfaz, bordes nítidos)</option>
                          <option value="Graphic with Alpha Channel">Graphic with Alpha Channel (Transparencia)</option>
                          <option value="Photography">Photography (Degradados tonales continuos)</option>
                          <option value="Illustration">Illustration (Gráficos vectoriales / Arte)</option>
                          <option value="Icon / UI Graphic">Icon / UI Graphic (Alta frecuencia espacial)</option>
                        </select>
                      </div>
                    </div>

                    {/* TARGET REQUIREMENTS */}
                    <div className="border border-slate-800/80 bg-slate-950/60 rounded-lg p-3.5 flex flex-col gap-3">
                      <div className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center justify-between">
                        <span>&lt;requisitos_destino&gt;</span>
                        <span className="text-slate-500">Compresión Estricta</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">
                            &lt;formato_objetivo&gt;
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setTarget({ ...target, target_format: 'AVIF' })}
                              className={`py-1.5 rounded text-center font-bold transition-colors ${
                                target.target_format === 'AVIF'
                                  ? 'bg-sky-600 text-white border border-sky-400'
                                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              AVIF
                            </button>
                            <button
                              type="button"
                              onClick={() => setTarget({ ...target, target_format: 'WebP' })}
                              className={`py-1.5 rounded text-center font-bold transition-colors ${
                                target.target_format === 'WebP'
                                  ? 'bg-sky-600 text-white border border-sky-400'
                                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              WebP
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">
                            &lt;peso_maximo_tolerado_kb&gt;
                          </label>
                          <input
                            type="number"
                            value={target.max_weight_kb}
                            onChange={(e) =>
                              setTarget({
                                ...target,
                                max_weight_kb: Math.max(1, parseFloat(e.target.value) || 1),
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card de Ejecución del Pipeline Sharp */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-mono uppercase text-slate-200">
                      EJECUTOR NATIVO SHARP
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                    Express & Sharp Online
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Aplica los parámetros computados a la imagen real en memoria ejecutando la función{' '}
                  <code className="text-sky-300">optimizeImage(buffer, targetFormat, options)</code>.
                </p>

                <button
                  onClick={handleExecuteSharpPipeline}
                  disabled={isProcessingSharp || !engineResult}
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-mono font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessingSharp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando con Sharp...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      {t.startBtn}
                    </>
                  )}
                </button>

                {serverError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-900 rounded-lg text-rose-300 text-xs font-mono">
                    {serverError}
                  </div>
                )}

                {/* Métricas de ejecución real si fue ejecutado */}
                {optimizedResult && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono flex flex-col gap-2">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Optimización Completada
                      </span>
                      <span>{optimizedResult.elapsed_ms} ms</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 text-[11px] border-t border-slate-900">
                      <div>
                        <span className="text-slate-500 block">PESO FINAL REAL</span>
                        <span className="font-bold text-sky-400 text-sm">
                          {optimizedResult.output.weight_kb} KB
                        </span>{' '}
                        <span className="text-emerald-400">(-{optimizedResult.reduction_percent}%)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">DIMENSIONES 1:1</span>
                        <span className="text-slate-200">
                          {optimizedResult.output.width}x{optimizedResult.output.height} px
                        </span>{' '}
                        {optimizedResult.dimensions_preserved && (
                          <span className="text-emerald-400 font-semibold">(Exacto)</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Visual Verification & Plan Summary (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Card de Estado del Plan y Garantía de Cero Pixelado */}
              {engineResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-sky-400" />
                      <h3 className="text-xs font-mono font-bold text-slate-200 uppercase">
                        DIAGNÓSTICO DEL MOTOR & INTEGRIDAD
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {engineResult.is_compromised ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/70 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-mono font-bold shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          COMPROMISED (Protección Visual)
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-mono font-bold shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          PASS (Cero Pixelación Garantizada)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalle del estado si es compromised */}
                  {engineResult.is_compromised && (
                    <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs font-mono text-amber-200/90 leading-relaxed">
                      <strong>REGLA DE INTEGRIDAD PRIORITARIA:</strong> El peso objetivo ({target.max_weight_kb}KB)
                      es inferior al límite físico de seguridad (~{engineResult.theoretical_min_safe_kb}KB) para {origin.width_px}x{origin.height_px}.
                      Para prevenir pixelado y artefactos en elementos de UI, el motor fija{' '}
                      <span className="text-white font-bold">Calidad = 75</span>, ignorando la meta destructiva de peso.
                    </div>
                  )}

                  {/* Matriz de Parámetros de Salida */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg text-xs font-mono border border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-500 block">FORMATO</span>
                      <span className="text-sky-400 font-bold text-sm">
                        {engineResult.plan.transformation_plan.target_format}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">CALIDAD (Q &ge; 75)</span>
                      <span className="text-white font-bold text-sm">
                        {engineResult.plan.transformation_plan.encoder_parameters.quality}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">EFFORT LEVEL</span>
                      <span className="text-indigo-400 font-bold text-sm">
                        {engineResult.plan.transformation_plan.encoder_parameters.effort_level}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">PRESERVE ALPHA</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {engineResult.plan.transformation_plan.encoder_parameters.preserve_alpha ? 'TRUE' : 'FALSE'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">DIMENSIONES 1:1</span>
                      <span className="text-slate-300 font-semibold">
                        {engineResult.plan.transformation_plan.dimensions.width_px}x
                        {engineResult.plan.transformation_plan.dimensions.height_px}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">ASPECT RATIO</span>
                      <span className="text-emerald-400 font-semibold">
                        {engineResult.plan.transformation_plan.dimensions.aspect_ratio_maintained ? '100% Intacto' : 'Alterado'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">PESO PROYECTADO</span>
                      <span className="text-amber-400 font-bold text-sm">
                        ~{engineResult.plan.transformation_plan.estimated_output_kb} KB
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">REDUCCIÓN ESTIMADA</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        -{Math.round(((origin.current_weight_kb - engineResult.plan.transformation_plan.estimated_output_kb) / origin.current_weight_kb) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Slider de Comparación Visual */}
              <ImageComparisonSlider
                originalSrc={originalImageSrc}
                optimizedSrc={optimizedResult?.imageBase64 || null}
                originalLabel={`${origin.current_format} (${origin.current_weight_kb} KB)`}
                optimizedLabel={
                  optimizedResult
                    ? `${optimizedResult.output.weight_kb} KB`
                    : `Estimado ~${engineResult?.plan.transformation_plan.estimated_output_kb || 0} KB`
                }
                hasAlpha={origin.content_type.includes('Alpha')}
                isProcessing={isProcessingSharp}
                onDownload={handleDownloadOptimized}
                format={target.target_format}
              />
            </div>
          </div>
        )}

        {/* TAB 2: SPECIFICATION & REASONING */}
        {activeTab === 'spec' && engineResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Espacio de Trabajo Verbatim */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
              <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span className="font-mono font-bold text-slate-200">
                    &lt;espacio_de_trabajo&gt; CADENA DE RAZONAMIENTO
                  </span>
                </div>
                <button
                  onClick={handleCopyReasoning}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors"
                >
                  {copiedReasoning ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedReasoning ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="p-5 bg-slate-950/80 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-amber-900">
                {engineResult.espacio_de_trabajo}
              </div>

              <div className="mt-auto px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>Paso 4 de 5 de la especificación técnica</span>
                <span className="text-emerald-400">Validación de umbral Q &ge; 75</span>
              </div>
            </div>

            {/* Objeto JSON estricto */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
              <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-sky-400" />
                  <span className="font-mono font-bold text-slate-200">
                    OBJETO JSON FORMATEADO (OUTPUT FORMAT 5)
                  </span>
                </div>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? 'Copiado' : 'Copiar JSON'}
                </button>
              </div>

              <div className="p-5 bg-slate-950/80 font-mono text-xs text-sky-300 leading-relaxed whitespace-pre selection:bg-sky-900 overflow-x-auto">
                {engineResult.json_output}
              </div>

              <div className="mt-auto px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>Sin backticks, saludos ni texto fuera del objeto</span>
                <button
                  onClick={handleExecuteSharpPipeline}
                  disabled={isProcessingSharp}
                  className="text-sky-400 hover:text-sky-300 font-semibold"
                >
                  → Ejecutar este plan en Sharp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BATCH REPO SIMULATOR */}
        {activeTab === 'batch' && <BatchSimulator />}

        {/* TAB 4: SHARP PIPELINE DOCUMENTATION */}
        {activeTab === 'docs' && <PipelineDocs />}
      </main>

     {/* Footer semántico y contenido estructurado para SEO */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8 px-4 font-sans text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {/* Bloque SEO: Search Intent informativo y comparativo */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs border-b border-slate-800/60 pb-6">
            <div>
              <h3 className="font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                {t.col1Title}
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {t.col1Desc}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                {t.col2Title}
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {t.col2Desc}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                {t.col3Title}
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {t.col3Desc}
              </p>
            </div>
          </section>

          {/* Barra de estado técnica */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
            <span>AVIFconverter Engine · Strict 1:1 Dimensions · Zero-Pixelation Guarantee · Sharp Core, sin registro</span>
            <span>Acceso Libre · Sin Registro</span>
          </div>
        </div>
      </footer>
      </div>
  );
}
