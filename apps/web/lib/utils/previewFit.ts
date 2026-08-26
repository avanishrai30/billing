export type PreviewFitInput = {
  labelWidthPx: number;
  labelHeightPx: number;
  availableWidthPx: number;
  availableHeightPx: number;
  paddingPx?: number;
  maxScale?: number;
};

export type PreviewFit = {
  scale: number;
  widthPx: number;
  heightPx: number;
  offsetX: number;
  offsetY: number;
};

export function calculatePreviewFit(input: PreviewFitInput): PreviewFit {
  const paddingPx = Math.max(0, input.paddingPx ?? 0);
  const maxScale = Math.max(0.1, input.maxScale ?? 3);
  const labelWidthPx = Math.max(1, input.labelWidthPx);
  const labelHeightPx = Math.max(1, input.labelHeightPx);
  const availableWidthPx = Math.max(1, input.availableWidthPx - paddingPx * 2);
  const availableHeightPx = Math.max(1, input.availableHeightPx - paddingPx * 2);
  const scale = Math.min(
    availableWidthPx / labelWidthPx,
    availableHeightPx / labelHeightPx,
    maxScale
  );
  const widthPx = labelWidthPx * scale;
  const heightPx = labelHeightPx * scale;

  return {
    scale,
    widthPx,
    heightPx,
    offsetX: Math.max(0, (input.availableWidthPx - widthPx) / 2),
    offsetY: Math.max(0, (input.availableHeightPx - heightPx) / 2)
  };
}
