import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

/**
 * Optimiza y convierte imágenes garantizando fidelidad visual y dimensiones exactas.
 */
async function optimizeImage(
  inputBuffer: Buffer,
  targetFormat: 'webp' | 'avif' = 'webp',
  options: {
    quality?: number;
    forceLossless?: boolean;
    effort?: number;
    chromaSubsampling?: string;
  } = {}
) {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  // Preservación estricta de dimensiones originales (1:1) y perfiles de color
  const pipeline = image.clone().withMetadata();

  if (targetFormat === 'webp') {
    return await pipeline
      .webp({
        quality: options.quality || 80,
        lossless: metadata.hasAlpha && options.forceLossless ? true : false,
        effort: options.effort ?? 6,
        smartSubsample: true,
      })
      .toBuffer();
  }

  if (targetFormat === 'avif') {
    return await pipeline
      .avif({
        quality: options.quality || 75,
        lossless: options.forceLossless || false,
        effort: options.effort ?? 7,
        chromaSubsampling: (options.chromaSubsampling as '4:4:4' | '4:2:0') || '4:4:4',
      })
      .toBuffer();
  }

  throw new Error(`Formato no soportado: ${targetFormat}`);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  const startTime = Date.now();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const {
      imageBase64,
      targetFormat: rawTargetFormat,
      target_format: altTargetFormat,
      quality,
      forceLossless,
      effort,
      chromaSubsampling,
    } = body || {};

    if (!imageBase64) {
      return res.status(400).json({
        error: "Falta el campo 'imageBase64' en el cuerpo de la solicitud JSON.",
      });
    }

    const targetFormat = (
      (rawTargetFormat || altTargetFormat || 'webp') as string
    ).toLowerCase() as 'webp' | 'avif';

    if (targetFormat !== 'webp' && targetFormat !== 'avif') {
      return res.status(400).json({
        error: `Formato objetivo no válido: ${targetFormat}. Solo 'avif' o 'webp'.`,
      });
    }

    const parsedQuality = quality ? parseInt(String(quality)) : 75;
    const parsedEffort = effort ? parseInt(String(effort)) : (targetFormat === 'avif' ? 7 : 6);
    const parsedForceLossless = forceLossless === true || forceLossless === 'true';

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const originalMeta = await sharp(buffer).metadata();
    const originalWeightKb = Math.round((buffer.length / 1024) * 100) / 100;

    const outputBuffer = await optimizeImage(buffer, targetFormat, {
      quality: parsedQuality,
      forceLossless: parsedForceLossless,
      effort: parsedEffort,
      chromaSubsampling: chromaSubsampling || '4:4:4',
    });

    const outputMeta = await sharp(outputBuffer).metadata();
    const outputWeightKb = Math.round((outputBuffer.length / 1024) * 100) / 100;
    const elapsedMs = Date.now() - startTime;

    const mimeType = targetFormat === 'avif' ? 'image/avif' : 'image/webp';
    const base64Output = `data:${mimeType};base64,${outputBuffer.toString('base64')}`;

    const dimensionsPreserved =
      originalMeta.width === outputMeta.width && originalMeta.height === outputMeta.height;

    const reductionPercent =
      Math.round(((originalWeightKb - outputWeightKb) / originalWeightKb) * 10000) / 100;

    return res.status(200).json({
      success: true,
      targetFormat: targetFormat.toUpperCase(),
      original: {
        width: originalMeta.width,
        height: originalMeta.height,
        weight_kb: originalWeightKb,
        format: originalMeta.format?.toUpperCase(),
        hasAlpha: Boolean(originalMeta.hasAlpha),
      },
      output: {
        width: outputMeta.width,
        height: outputMeta.height,
        weight_kb: outputWeightKb,
        format: outputMeta.format?.toUpperCase(),
        hasAlpha: Boolean(outputMeta.hasAlpha),
      },
      dimensions_preserved: dimensionsPreserved,
      reduction_percent: reductionPercent,
      elapsed_ms: elapsedMs,
      encoder_parameters: {
        quality: parsedQuality,
        effort: parsedEffort,
        forceLossless: parsedForceLossless,
        chromaSubsampling: targetFormat === 'avif' ? (chromaSubsampling || '4:4:4') : undefined,
        smartSubsample: targetFormat === 'webp' ? true : undefined,
      },
      imageBase64: base64Output,
    });
  } catch (err: any) {
    console.error('Error optimizing image in Vercel function:', err);
    return res.status(500).json({ error: err.message || 'Fallo en optimización de imagen' });
  }
}
