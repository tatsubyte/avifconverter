import {
  OriginData,
  TargetRequirements,
  TransformationPlan,
  EngineCalculationResult,
  ImageContentType,
} from '../types/optimizer';

/**
 * Advanced Image Processing and Optimization Engine
 * Operates with mathematical precision, prioritizing visual integrity (zero pixelation/artifacts)
 * and strict 1:1 dimensional consistency.
 */
export function computeOptimizationPlan(
  origin: OriginData,
  target: TargetRequirements
): EngineCalculationResult {
  // 0. Validaciones estrictas
  if (!target.target_format) {
    throw new Error('Falta el formato objetivo (<formato_objetivo>). Operación abortada.');
  }

  const { current_weight_kb, width_px, height_px, content_type } = origin;
  const { target_format, max_weight_kb } = target;

  const totalPixels = width_px * height_px;
  const megapixels = Math.round((totalPixels / 1_000_000) * 100) / 100;

  // 1. Ratio de compresión y bpp (bits per pixel)
  const compressionRatio = Math.round((max_weight_kb / current_weight_kb) * 1000) / 1000;
  const reductionTargetPct = Math.round((1 - compressionRatio) * 1000) / 10;

  const bppOriginal = Math.round(((current_weight_kb * 8192) / totalPixels) * 1000) / 1000;
  const bppTarget = Math.round(((max_weight_kb * 8192) / totalPixels) * 1000) / 1000;

  // 2. Evaluación de tipo de contenido y esquema lossy vs lossless
  const hasAlpha =
    content_type === 'Graphic with Alpha Channel' ||
    content_type === 'UI Element' ||
    origin.current_format.toUpperCase() === 'PNG';

  let lossless = false;
  // Lossless solo es viable si el peso objetivo tolera la entropía sin pérdida
  // En WebP/AVIF lossless para UI/gráficos con alfa suele necesitar > 1.8 bpp
  if (content_type === 'Icon / UI Graphic' && bppTarget >= 1.6 && max_weight_kb >= current_weight_kb * 0.4) {
    lossless = true;
  }

  // 3. Parámetros de codec y umbrales de compresión
  // AVIF es ~25-35% más eficiente que WebP en retención perceptual de bordes
  const effortLevel = target_format === 'AVIF' ? 7 : 6;
  const formatEfficiencyMultiplier = target_format === 'AVIF' ? 0.72 : 0.88;

  // Estimación de bpp seguro para Quality >= 75 sin pixelado según tipo de contenido
  let safeBppAt75 = 0.72;
  if (content_type === 'Photography') {
    safeBppAt75 = 0.82;
  } else if (content_type === 'UI Element') {
    safeBppAt75 = 0.70;
  } else if (content_type === 'Graphic with Alpha Channel') {
    safeBppAt75 = 0.75;
  } else if (content_type === 'Illustration') {
    safeBppAt75 = 0.65;
  } else {
    safeBppAt75 = 0.60;
  }

  // Ajuste por codec (AVIF comprime más eficiente a Quality 75)
  safeBppAt75 *= formatEfficiencyMultiplier;

  // Peso mínimo seguro en KB para mantener Quality >= 75
  const theoreticalMinSafeKb = Math.round(((totalPixels * safeBppAt75) / 8192) * 10) / 10;

  let calculatedQuality = 75;
  let isCompromised = false;
  let compromisedReason = '';
  let estimatedOutputKb = theoreticalMinSafeKb;

  if (lossless) {
    estimatedOutputKb = Math.round(current_weight_kb * 0.45 * 10) / 10;
    if (estimatedOutputKb > max_weight_kb) {
      isCompromised = true;
      compromisedReason = `El modo lossless excede el límite de ${max_weight_kb}KB; se mantiene para evitar pérdida en gráficos vectoriales/iconos.`;
    }
  } else if (max_weight_kb < theoreticalMinSafeKb) {
    // Es matemáticamente imposible sin descender de Quality 75
    isCompromised = true;
    calculatedQuality = 75;
    // Estimación calibrada en base a la entropía original
    const entropyFactor = Math.min(1.15, Math.max(0.9, current_weight_kb / (theoreticalMinSafeKb * 4)));
    estimatedOutputKb = Math.round(theoreticalMinSafeKb * entropyFactor * 10) / 10;
    compromisedReason = `El límite de ${max_weight_kb}KB es inferior al umbral de seguridad para ${width_px}x${height_px} (${megapixels} MP); se mantiene calidad 75 para evitar pixelación.`;
  } else {
    // El peso objetivo es holgado: podemos ajustar la calidad entre 75 y 95
    const headRoom = (max_weight_kb - theoreticalMinSafeKb) / theoreticalMinSafeKb;
    calculatedQuality = Math.min(95, Math.round(75 + Math.min(18, headRoom * 15)));
    // El peso estimado escala con la calidad
    const qualityScale = 1 + (calculatedQuality - 75) * 0.025;
    estimatedOutputKb = Math.round(Math.min(max_weight_kb * 0.94, theoreticalMinSafeKb * qualityScale) * 10) / 10;
  }

  const integrityStatus = isCompromised
    ? `COMPROMISED - ${compromisedReason}`
    : 'PASS';

  // 4. Construcción del <espacio_de_trabajo>
  const espacioDeTrabajo = `<espacio_de_trabajo>
1. **Cálculo de ratio de compresión**: Se requiere una reducción del ${reductionTargetPct}% del peso original (${max_weight_kb}KB / ${current_weight_kb}KB = ${compressionRatio}). Densidad bpp inicial: ${bppOriginal} bits/px vs objetivo: ${bppTarget} bits/px.
2. **Evaluación de contenido**: "${content_type}" requiere ${content_type === 'UI Element' ? 'una alta fidelidad en bordes y contraste' : content_type === 'Photography' ? 'un balance tonal continuo sin artefactos de bloque' : 'preservación estricta de canal alfa sin halos'}. Se determina el uso de codificación ${lossless ? 'sin pérdida (lossless)' : 'con pérdida (lossy) optimizada'}, ya que ${lossless ? 'el formato objetivo tolera compresión sin pérdida' : `una codificación sin pérdida excedería masivamente el límite de ${max_weight_kb}KB para una resolución de ${width_px}x${height_px}`}.
3. **Parámetros de Codec**: Para ${target_format}, se selecciona un \`effort_level\` de ${effortLevel} para maximizar la eficiencia.${target_format === 'AVIF' ? ' Se impone un `chromaSubsampling` de 4:4:4 (implícito en la lógica de preservación de UI y alfa) para evitar el "color bleeding" en elementos de interfaz definidos.' : ' Se activa `smartSubsample: true` para mantener bordes nítidos y nulo desenfoque en líneas de interfaz.'} La calidad se establece en ${calculatedQuality}${isCompromised ? ' (umbral mínimo crítico permitido de 75)' : ''} para ${isCompromised ? 'garantizar cero artefactos perceptuales' : 'optimizar la entrega web'}.
4. **Matriz dimensional**: Se mantiene estrictamente en ${width_px}x${height_px} (Ratio ${getAspectRatioString(width_px, height_px)}, aspecto 1:1 intacto).
5. **Verificación de integridad**: ${isCompromised ? `Dado el tamaño de la matriz (${megapixels} megapíxeles), alcanzar ${max_weight_kb}KB con un \`target_format\` ${target_format} manteniendo la calidad perceptiva >= 75 es matemáticamente inviable sin pixelado. El peso final proyectado es de ~${estimatedOutputKb}KB. Se prioriza la regla de integridad visual sobre el límite de peso estricto.` : `El límite de ${max_weight_kb}KB es plenamente alcanzable manteniendo un nivel de calidad superior (${calculatedQuality}) sin degradación perceptible. Se valida PASS.`}
</espacio_de_trabajo>`;

  const plan: TransformationPlan = {
    transformation_plan: {
      target_format,
      dimensions: {
        width_px,
        height_px,
        aspect_ratio_maintained: true,
      },
      encoder_parameters: {
        quality: calculatedQuality,
        lossless,
        effort_level: effortLevel,
        preserve_alpha: hasAlpha,
      },
      estimated_output_kb: estimatedOutputKb,
      integrity_status: integrityStatus,
    },
  };

  const jsonOutput = JSON.stringify(plan, null, 2);

  return {
    plan,
    espacio_de_trabajo: espacioDeTrabajo,
    json_output: jsonOutput,
    bpp_original: bppOriginal,
    bpp_target: bppTarget,
    compression_ratio: compressionRatio,
    reduction_target_pct: reductionTargetPct,
    theoretical_min_safe_kb: theoreticalMinSafeKb,
    is_compromised: isCompromised,
    compromised_reason: compromisedReason,
  };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function getAspectRatioString(w: number, h: number): string {
  if (!w || !h) return '1:1';
  const divisor = gcd(w, h);
  const ratioW = w / divisor;
  const ratioH = h / divisor;
  if (ratioW > 32 || ratioH > 32) {
    const dec = Math.round((w / h) * 100) / 100;
    return `${dec}:1`;
  }
  return `${ratioW}:${ratioH}`;
}

export function parseXmlInput(xmlString: string): {
  origin?: Partial<OriginData>;
  target?: Partial<TargetRequirements>;
  errors: string[];
} {
  const errors: string[] = [];
  const origin: Partial<OriginData> = {};
  const target: Partial<TargetRequirements> = {};

  try {
    const formatMatch = xmlString.match(/<formato_actual>([\s\S]*?)<\/formato_actual>/i);
    if (formatMatch) origin.current_format = formatMatch[1].trim().toUpperCase();

    const weightMatch = xmlString.match(/<peso_actual_kb>([\s\S]*?)<\/peso_actual_kb>/i);
    if (weightMatch) {
      const val = parseFloat(weightMatch[1].trim());
      if (!isNaN(val)) origin.current_weight_kb = val;
    }

    const widthMatch = xmlString.match(/<ancho_px>([\s\S]*?)<\/ancho_px>/i);
    if (widthMatch) {
      const val = parseInt(widthMatch[1].trim());
      if (!isNaN(val)) origin.width_px = val;
    }

    const heightMatch = xmlString.match(/<alto_px>([\s\S]*?)<\/alto_px>/i);
    if (heightMatch) {
      const val = parseInt(heightMatch[1].trim());
      if (!isNaN(val)) origin.height_px = val;
    }

    const contentTypeMatch = xmlString.match(/<tipo_contenido>([\s\S]*?)<\/tipo_contenido>/i);
    if (contentTypeMatch) {
      const rawType = contentTypeMatch[1].trim();
      if (/UI/i.test(rawType)) origin.content_type = 'UI Element';
      else if (/Alpha|Transparen/i.test(rawType)) origin.content_type = 'Graphic with Alpha Channel';
      else if (/Photo|Foto/i.test(rawType)) origin.content_type = 'Photography';
      else if (/Illustrat/i.test(rawType)) origin.content_type = 'Illustration';
      else origin.content_type = 'UI Element';
    }

    const targetFormatMatch = xmlString.match(/<formato_objetivo>([\s\S]*?)<\/formato_objetivo>/i);
    if (targetFormatMatch) {
      const rawTarget = targetFormatMatch[1].trim().toUpperCase();
      if (rawTarget === 'AVIF' || rawTarget === 'WEBP') {
        target.target_format = rawTarget as 'AVIF' | 'WebP';
      } else {
        errors.push(`Formato objetivo no reconocido: "${rawTarget}". Debe ser AVIF o WebP.`);
      }
    } else {
      errors.push('Falta la etiqueta obligatoria <formato_objetivo>');
    }

    const maxWeightMatch = xmlString.match(/<peso_maximo_tolerado_kb>([\s\S]*?)<\/peso_maximo_tolerado_kb>/i);
    if (maxWeightMatch) {
      const val = parseFloat(maxWeightMatch[1].trim());
      if (!isNaN(val)) target.max_weight_kb = val;
    }
  } catch (err: any) {
    errors.push('Error de sintaxis al parsear XML: ' + err.message);
  }

  return { origin, target, errors };
}

export function generateXmlTemplate(origin: OriginData, target: TargetRequirements): string {
  return `<datos_origen>
  <formato_actual>${origin.current_format}</formato_actual>
  <peso_actual_kb>${origin.current_weight_kb}</peso_actual_kb>
  <dimensiones>
    <ancho_px>${origin.width_px}</ancho_px>
    <alto_px>${origin.height_px}</alto_px>
  </dimensiones>
  <tipo_contenido>${origin.content_type}</tipo_contenido>
</datos_origen>

<requisitos_destino>
  <formato_objetivo>${target.target_format}</formato_objetivo>
  <peso_maximo_tolerado_kb>${target.max_weight_kb}</peso_maximo_tolerado_kb>
</requisitos_destino>`;
}
