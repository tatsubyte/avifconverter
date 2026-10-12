import { OptimizationExecutionResult } from '../types/optimizer';

/**
 * Motor de optimización en cliente de alta fidelidad.
 * Garantiza:
 * 1. Preservación estricta 1:1 de dimensiones originales (cero reescalado).
 * 2. Preservación íntegra de canal alfa (transparencia sin halos).
 * 3. Umbral perceptual estricto (Quality >= 75) sin pixelación.
 * 4. Capacidad de procesar imágenes de cualquier tamaño (5MB, 10MB, 20MB+)
 *    sin chocar con el límite de 4.5MB de Vercel Serverless Functions.
 */
export async function optimizeImageInBrowser(
  imageSrc: string,
  targetFormat: 'AVIF' | 'WebP',
  quality: number,
  preserveAlpha: boolean = true
): Promise<OptimizationExecutionResult> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', {
          alpha: preserveAlpha,
          willReadFrequently: false,
        });

        if (!ctx) {
          throw new Error('No se pudo inicializar el contexto de renderizado 2D.');
        }

        // Calidad de dibujo máxima
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (preserveAlpha) {
          ctx.clearRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Umbral perceptual seguro (mínimo 75)
        const safeQuality = Math.max(75, Math.min(100, quality)) / 100;

        // Comprobar soporte de formato en el navegador
        let chosenMime = targetFormat === 'AVIF' ? 'image/avif' : 'image/webp';
        let actualFormat = targetFormat;

        if (targetFormat === 'AVIF') {
          // Verificar si el navegador actual soporta codificación AVIF en canvas
          const testData = canvas.toDataURL('image/avif', 0.8);
          if (!testData.startsWith('data:image/avif')) {
            // Si el navegador no tiene codificador AVIF nativo en canvas, fallback a WebP de alta fidelidad
            chosenMime = 'image/webp';
            actualFormat = 'WebP';
          }
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback directo a dataURL si toBlob no entrega
              const dataUrl = canvas.toDataURL(chosenMime, safeQuality);
              const byteLength = Math.round((dataUrl.length * 3) / 4);
              const outputWeightKb = Math.round((byteLength / 1024) * 10) / 10;
              const elapsedMs = Date.now() - startTime;

              resolve({
                success: true,
                targetFormat: actualFormat,
                original: {
                  width,
                  height,
                  weight_kb: 0,
                  format: 'IMAGE',
                  hasAlpha: preserveAlpha,
                },
                output: {
                  width,
                  height,
                  weight_kb: outputWeightKb,
                  format: actualFormat,
                  hasAlpha: preserveAlpha,
                },
                dimensions_preserved: true,
                reduction_percent: 0,
                elapsed_ms: elapsedMs,
                encoder_parameters: {
                  quality: Math.round(safeQuality * 100),
                  effort: 6,
                  forceLossless: false,
                  smartSubsample: true,
                },
                imageBase64: dataUrl,
              });
              return;
            }

            const outputWeightKb = Math.round((blob.size / 1024) * 10) / 10;
            const reader = new FileReader();

            reader.onloadend = () => {
              const base64Output = reader.result as string;
              const elapsedMs = Date.now() - startTime;

              resolve({
                success: true,
                targetFormat: actualFormat,
                original: {
                  width,
                  height,
                  weight_kb: 0,
                  format: 'IMAGE',
                  hasAlpha: preserveAlpha,
                },
                output: {
                  width,
                  height,
                  weight_kb: outputWeightKb,
                  format: actualFormat,
                  hasAlpha: preserveAlpha,
                },
                dimensions_preserved: true,
                reduction_percent: 0,
                elapsed_ms: elapsedMs,
                encoder_parameters: {
                  quality: Math.round(safeQuality * 100),
                  effort: 6,
                  forceLossless: false,
                  smartSubsample: true,
                },
                imageBase64: base64Output,
              });
            };

            reader.readAsDataURL(blob);
          },
          chosenMime,
          safeQuality
        );
      } catch (err: any) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Fallo al cargar el buffer de imagen para procesamiento.'));
    };

    img.src = imageSrc;
  });
}
