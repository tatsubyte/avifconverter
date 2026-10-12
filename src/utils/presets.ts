import { PresetSample } from '../types/optimizer';

export const SAMPLE_PRESETS: PresetSample[] = [
  {
    id: 'user_prompt_case',
    name: '1080p Web Application UI (Caso Prompt)',
    description: '1920x1080 UI Dashboard con panel translúcido y bordes nítidos. Prueba estricta del límite 150KB.',
    origin: {
      current_format: 'PNG',
      current_weight_kb: 1250,
      width_px: 1920,
      height_px: 1080,
      content_type: 'UI Element',
    },
    target: {
      target_format: 'AVIF',
      max_weight_kb: 150,
    },
    previewSvg: '',
  },
  {
    id: 'graphic_alpha',
    name: 'Hero Graphic con Canal Alfa (Transparencia)',
    description: '1200x800 Gráfico de producto con gradiente de transparencia y sombras suaves.',
    origin: {
      current_format: 'PNG',
      current_weight_kb: 890,
      width_px: 1200,
      height_px: 800,
      content_type: 'Graphic with Alpha Channel',
    },
    target: {
      target_format: 'WebP',
      max_weight_kb: 220,
    },
    previewSvg: '',
  },
  {
    id: 'photo_4k',
    name: 'Fotografía Editorial en Alta Resolución',
    description: '2560x1440 Fotografía de paisaje con alta frecuencia de textura y gradación tonal.',
    origin: {
      current_format: 'JPEG',
      current_weight_kb: 2840,
      width_px: 2560,
      height_px: 1440,
      content_type: 'Photography',
    },
    target: {
      target_format: 'AVIF',
      max_weight_kb: 420,
    },
    previewSvg: '',
  },
  {
    id: 'dashboard_chart',
    name: 'Panel de Gráficos e Iconografía Web',
    description: '1440x900 Interfaz SaaS con curvas de datos, texto y contraste estricto.',
    origin: {
      current_format: 'PNG',
      current_weight_kb: 640,
      width_px: 1440,
      height_px: 900,
      content_type: 'UI Element',
    },
    target: {
      target_format: 'WebP',
      max_weight_kb: 110,
    },
    previewSvg: '',
  },
  {
    id: 'app_icon',
    name: 'Icono de Aplicación & Badge con Máscara',
    description: '512x512 Gráfico vectorial rasterizado con bordes anti-aliased y fondo transparente.',
    origin: {
      current_format: 'PNG',
      current_weight_kb: 310,
      width_px: 512,
      height_px: 512,
      content_type: 'Icon / UI Graphic',
    },
    target: {
      target_format: 'AVIF',
      max_weight_kb: 35,
    },
    previewSvg: '',
  },
];

/**
 * Genera dinámicamente un Canvas real y lo exporta como Data URL para que el usuario
 * pueda enviar un buffer binario auténtico al servidor Sharp de prueba.
 */
export function generateSyntheticImage(presetId: string): Promise<string> {
  return new Promise((resolve) => {
    const preset = SAMPLE_PRESETS.find((p) => p.id === presetId) || SAMPLE_PRESETS[0];
    const canvas = document.createElement('canvas');
    // Para renderizar rápido en navegador usamos las dimensiones del preset (escaladas si son gigantes para canvas o 1:1)
    canvas.width = Math.min(preset.origin.width_px, 1920);
    canvas.height = Math.min(preset.origin.height_px, 1080);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve('');
      return;
    }

    const { width, height } = canvas;

    if (preset.id === 'graphic_alpha' || preset.id === 'app_icon') {
      // Fondo transparente para probar preservación de canal alfa
      ctx.clearRect(0, 0, width, height);

      // Círculo central con degradado y sombra
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(0.5, '#3b82f6');
      grad.addColorStop(1, '#8b5cf6');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Detalles de borde fino para probar subsampling 4:4:4
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Texto de alta definición
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ALPHA CHANNEL 4:4:4', width / 2, height / 2);
    } else if (preset.id === 'user_prompt_case' || preset.id === 'dashboard_chart') {
      // Simulación de interfaz UI oscura con gradientes, cards y líneas nítidas
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid de fondo sutil
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Card UI con transparencia
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      const cardX = width * 0.1;
      const cardY = height * 0.15;
      const cardW = width * 0.8;
      const cardH = height * 0.7;

      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 16);
      ctx.fill();
      ctx.stroke();

      // Texto de métricas nítidas
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 42px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('OPTIMATRIX UI BENCHMARK // 1080p', cardX + 40, cardY + 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        `Original: ${preset.origin.width_px}x${preset.origin.height_px} px | Target: ${preset.target.target_format} < ${preset.target.max_weight_kb}KB`,
        cardX + 40,
        cardY + 115
      );

      // Gráfica de curvas sintéticas
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 20; i++) {
        const px = cardX + 40 + i * ((cardW - 80) / 19);
        const py = cardY + cardH - 100 - Math.sin(i * 0.5) * 80 - (i % 3) * 20;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else {
      // Fotografía simulada
      const grad = ctx.createRadialGradient(
        width * 0.4,
        height * 0.3,
        50,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(0.3, '#ef4444');
      grad.addColorStop(0.7, '#6366f1');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIGH-DYNAMIC RANGE PHOTOMETRY', width / 2, height / 2);
    }

    resolve(canvas.toDataURL(preset.origin.current_format === 'JPEG' ? 'image/jpeg' : 'image/png'));
  });
}
