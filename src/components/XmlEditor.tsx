import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { OriginData, TargetRequirements } from '../types/optimizer';
import { generateXmlTemplate, parseXmlInput } from '../utils/engine';

interface Props {
  origin: OriginData;
  target: TargetRequirements;
  onSyncXml: (origin: OriginData, target: TargetRequirements) => void;
}

export const XmlEditor: React.FC<Props> = ({ origin, target, onSyncXml }) => {
  const [rawText, setRawText] = useState(() => generateXmlTemplate(origin, target));
  const [copied, setCopied] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'edited'>('synced');

  // Mantener actualizado cuando las props cambian externamente
  useEffect(() => {
    setRawText(generateXmlTemplate(origin, target));
    setSyncStatus('synced');
    setParseErrors([]);
  }, [origin, target]);

  const handleChange = (newVal: string) => {
    setRawText(newVal);
    setSyncStatus('edited');
    const { origin: parsedOrigin, target: parsedTarget, errors } = parseXmlInput(newVal);
    setParseErrors(errors);

    if (errors.length === 0 && parsedOrigin && parsedTarget) {
      if (
        parsedOrigin.current_format &&
        parsedOrigin.current_weight_kb &&
        parsedOrigin.width_px &&
        parsedOrigin.height_px &&
        parsedOrigin.content_type &&
        parsedTarget.target_format &&
        parsedTarget.max_weight_kb
      ) {
        onSyncXml(parsedOrigin as OriginData, parsedTarget as TargetRequirements);
        setSyncStatus('synced');
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetToCurrent = () => {
    setRawText(generateXmlTemplate(origin, target));
    setParseErrors([]);
    setSyncStatus('synced');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-mono text-amber-400 font-bold">&lt;/&gt; ENTORNO XML RAW</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 text-[11px]">
            {syncStatus === 'synced' ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Sincronizado 1:1 con Engine
              </span>
            ) : (
              <span className="text-amber-400">Modificado manualmente...</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToCurrent}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded text-xs transition-colors"
            title="Restablecer a valores de los controles"
          >
            <RefreshCw className="w-3 h-3" /> Restablecer
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copiado' : 'Copiar XML'}
          </button>
        </div>
      </div>

      {/* Editor text area */}
      <div className="relative">
        <textarea
          value={rawText}
          onChange={(e) => handleChange(e.target.value)}
          rows={14}
          className="w-full bg-slate-950 text-slate-200 font-mono text-xs p-4 focus:outline-none focus:ring-1 focus:ring-sky-500 border-none resize-none leading-relaxed selection:bg-sky-900 selection:text-white"
          spellCheck={false}
        />
      </div>

      {/* Errors list */}
      {parseErrors.length > 0 && (
        <div className="px-4 py-2.5 bg-rose-950/60 border-t border-rose-900/50 flex flex-col gap-1 text-xs text-rose-300">
          <div className="flex items-center gap-1.5 font-semibold font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400" /> RESTRICCIÓN DEL MOTOR NO CUMPLIDA:
          </div>
          {parseErrors.map((err, i) => (
            <div key={i} className="pl-5 text-rose-200 font-mono text-[11px]">
              • {err}
            </div>
          ))}
        </div>
      )}

      {/* Helper footer */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span>Tags obligatorios: &lt;datos_origen&gt; y &lt;requisitos_destino&gt;</span>
        <span>Parser activo</span>
      </div>
    </div>
  );
};
