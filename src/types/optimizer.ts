export type ImageContentType =
  | 'Photography'
  | 'UI Element'
  | 'Graphic with Alpha Channel'
  | 'Illustration'
  | 'Icon / UI Graphic';

export type TargetFormat = 'AVIF' | 'WebP';

export interface OriginData {
  current_format: string;
  current_weight_kb: number;
  width_px: number;
  height_px: number;
  content_type: ImageContentType;
}

export interface TargetRequirements {
  target_format: TargetFormat;
  max_weight_kb: number;
}

export interface EncoderParameters {
  quality: number;
  lossless: boolean;
  effort_level: number;
  preserve_alpha: boolean;
}

export interface TransformationDimensions {
  width_px: number;
  height_px: number;
  aspect_ratio_maintained: boolean;
}

export interface TransformationPlan {
  transformation_plan: {
    target_format: string;
    dimensions: TransformationDimensions;
    encoder_parameters: EncoderParameters;
    estimated_output_kb: number;
    integrity_status: string;
  };
}

export interface EngineCalculationResult {
  plan: TransformationPlan;
  espacio_de_trabajo: string;
  json_output: string;
  bpp_original: number;
  bpp_target: number;
  compression_ratio: number;
  reduction_target_pct: number;
  theoretical_min_safe_kb: number;
  is_compromised: boolean;
  compromised_reason?: string;
}

export interface OptimizationExecutionResult {
  success: boolean;
  targetFormat: string;
  original: {
    width: number;
    height: number;
    weight_kb: number;
    format: string;
    hasAlpha: boolean;
  };
  output: {
    width: number;
    height: number;
    weight_kb: number;
    format: string;
    hasAlpha: boolean;
  };
  dimensions_preserved: boolean;
  reduction_percent: number;
  elapsed_ms: number;
  encoder_parameters: {
    quality: number;
    effort: number;
    forceLossless: boolean;
    chromaSubsampling?: string;
    smartSubsample?: boolean;
  };
  imageBase64: string;
}

export interface PresetSample {
  id: string;
  name: string;
  description: string;
  origin: OriginData;
  target: TargetRequirements;
  previewSvg: string;
}
