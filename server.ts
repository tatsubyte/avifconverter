import express, { Request, Response } from 'express';
import sharp from 'sharp';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  storage: multer.memoryStorage(),
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Optimiza y convierte imágenes garantizando fidelidad visual y dimensiones exactas.
 * Implementación exacta según especificación técnica.
 */
export async function optimizeImage(
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

  // Preservación estricta de dimensiones originales (1:1)
const pipeline = image.clone().withMetadata();

  if (targetFormat === 'webp') {
    return await pipeline
      .webp({
        quality: options.quality || 80,
        lossless: metadata.hasAlpha && options.forceLossless ? true : false,
        effort: options.effort ?? 6, // Rango 0-6: optimización máxima de tamaño
        smartSubsample: true, // Mantiene bordes nítidos en elementos UI
      })
      .toBuffer();
  }

  if (targetFormat === 'avif') {
    return await pipeline
      .avif({
        quality: options.quality || 75,
        lossless: options.forceLossless || false,
        effort: options.effort ?? 7, // Rango 0-9: compresión eficiente para web
        chromaSubsampling: (options.chromaSubsampling as '4:4:4' | '4:2:0') || '4:4:4', // Evita pérdida de definición en contraste alto
      })
      .toBuffer();
  }

  throw new Error(`Formato no soportado: ${targetFormat}`);
}

// API: Analyze image buffer
app.post('/api/analyze', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let buffer: Buffer | null = null;
    if (req.file) {
      buffer = req.file.buffer;
    } else if (body.imageBase64) {
      const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    }

    if (!buffer) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen para análisis' });
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();

    const weightKb = Math.round((buffer.length / 1024) * 100) / 100;
    const hasAlpha = Boolean(metadata.hasAlpha);

    // Heurística de tipo de contenido
    let contentType = 'Photography';
    if (hasAlpha) {
      contentType = 'Graphic with Alpha Channel';
    } else if (metadata.format === 'png' || (metadata.width && metadata.width < 1200 && metadata.height && metadata.height < 1200)) {
      contentType = 'UI Element';
    }

    return res.json({
      format: metadata.format?.toUpperCase() || 'UNKNOWN',
      width: metadata.width || 0,
      height: metadata.height || 0,
      hasAlpha,
      channels: metadata.channels,
      weight_kb: weightKb,
      space: metadata.space,
      density: metadata.density,
      contentType,
    });
  } catch (err: any) {
    console.error('Error analyzing image:', err);
    return res.status(500).json({ error: err.message || 'Error al analizar la imagen' });
  }
});

// API: Real optimization execution using Sharp
app.post('/api/optimize', upload.single('image'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let buffer: Buffer | null = null;
    if (req.file) {
      buffer = req.file.buffer;
    } else if (body.imageBase64) {
      const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    }

    if (!buffer) {
      return res.status(400).json({ error: 'Falta buffer de imagen de entrada' });
    }

    const targetFormat = (body.targetFormat || body.target_format || 'webp').toLowerCase() as 'webp' | 'avif';
    if (targetFormat !== 'webp' && targetFormat !== 'avif') {
      return res.status(400).json({ error: `Formato objetivo no válido: ${targetFormat}. Solo 'avif' o 'webp'.` });
    }

    const quality = body.quality ? parseInt(body.quality) : 75;
    const forceLossless = body.forceLossless === true || body.forceLossless === 'true';
    const effort = body.effort ? parseInt(body.effort) : (targetFormat === 'avif' ? 7 : 6);
    const chromaSubsampling = body.chromaSubsampling || '4:4:4';

    const originalMeta = await sharp(buffer).metadata();
    const originalWeightKb = Math.round((buffer.length / 1024) * 100) / 100;

    // Ejecutar pipeline
    const outputBuffer = await optimizeImage(buffer, targetFormat, {
      quality,
      forceLossless,
      effort,
      chromaSubsampling,
    });

    const outputMeta = await sharp(outputBuffer).metadata();
    const outputWeightKb = Math.round((outputBuffer.length / 1024) * 100) / 100;
    const elapsedMs = Date.now() - startTime;

    const mimeType = targetFormat === 'avif' ? 'image/avif' : 'image/webp';
    const base64Output = `data:${mimeType};base64,${outputBuffer.toString('base64')}`;

    // Verificación dimensional estricta 1:1
    const dimensionsPreserved =
      originalMeta.width === outputMeta.width && originalMeta.height === outputMeta.height;

    const reductionPercent = Math.round(((originalWeightKb - outputWeightKb) / originalWeightKb) * 10000) / 100;

    return res.json({
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
        quality,
        effort,
        forceLossless,
        chromaSubsampling: targetFormat === 'avif' ? chromaSubsampling : undefined,
        smartSubsample: targetFormat === 'webp' ? true : undefined,
      },
      imageBase64: base64Output,
    });
  } catch (err: any) {
    console.error('Error optimizing image:', err);
    return res.status(500).json({ error: err.message || 'Fallo en optimización de imagen' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OptiMatrix Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
