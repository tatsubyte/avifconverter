import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { imageBase64 } = body || {};

    if (!imageBase64) {
      return res.status(400).json({
        error: "Falta el campo 'imageBase64' en el cuerpo JSON de la solicitud.",
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const image = sharp(buffer);
    const metadata = await image.metadata();

    const weightKb = Math.round((buffer.length / 1024) * 100) / 100;
    const hasAlpha = Boolean(metadata.hasAlpha);

    let contentType = 'Photography';
    if (hasAlpha) {
      contentType = 'Graphic with Alpha Channel';
    } else if (
      metadata.format === 'png' ||
      (metadata.width && metadata.width < 1200 && metadata.height && metadata.height < 1200)
    ) {
      contentType = 'UI Element';
    }

    return res.status(200).json({
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
    console.error('Error analyzing image in Vercel function:', err);
    return res.status(500).json({ error: err.message || 'Error al analizar la imagen' });
  }
}
