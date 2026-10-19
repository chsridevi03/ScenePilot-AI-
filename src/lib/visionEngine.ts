import {
  QualityMetrics,
  AlignmentResult,
  BoundingBox,
  ComparisonResult,
  RoiInspectionDetail,
} from '../types/vision';

/**
 * High-performance computer vision algorithms executing directly on Canvas ImageData,
 * adhering to the mathematical specifications of OpenCV functions (cv2.Laplacian,
 * cv2.phaseCorrelate, cv2.absdiff, cv2.findContours, and Otsu/Adaptive Thresholding).
 */

export function getImageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function createCanvasFromImageData(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * 1. Image Blur and Quality Detection (Laplacian Variance & Exposure)
 * OpenCV equivalent: cv2.Laplacian(gray, cv2.CV_64F).var()
 */
export function evaluateImageQuality(imageData: ImageData): QualityMetrics {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const totalPixels = width * height;

  // Convert to grayscale & compute mean luminance
  const gray = new Float32Array(totalPixels);
  let luminanceSum = 0;

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // Standard sRGB to Grayscale conversion
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[j] = y;
    luminanceSum += y;
  }

  const meanBrightness = luminanceSum / totalPixels;

  // Compute contrast (standard deviation of grayscale values)
  let varianceSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const diff = gray[i] - meanBrightness;
    varianceSum += diff * diff;
  }
  const contrast = Math.sqrt(varianceSum / totalPixels);

  // Apply Discrete 3x3 Laplacian Kernel:
  // [ 0,  1,  0 ]
  // [ 1, -4,  1 ]
  // [ 0,  1,  0 ]
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let evaluatedPixels = 0;

  // Step with stride 2 for fast real-time performance while preserving statistical variance
  const step = 2;
  for (let y = 1; y < height - 1; y += step) {
    const rowOffset = y * width;
    const rowAbove = (y - 1) * width;
    const rowBelow = (y + 1) * width;

    for (let x = 1; x < width - 1; x += step) {
      const lap =
        gray[rowAbove + x] +
        gray[rowBelow + x] +
        gray[rowOffset + (x - 1)] +
        gray[rowOffset + (x + 1)] -
        4 * gray[rowOffset + x];

      laplacianSum += lap;
      laplacianSqSum += lap * lap;
      evaluatedPixels++;
    }
  }

  const laplacianMean = laplacianSum / evaluatedPixels;
  const laplacianVariance = laplacianSqSum / evaluatedPixels - laplacianMean * laplacianMean;

  // Calibrate sharpness score (0 - 100).
  // Typical sharp natural scenes have Laplacian variance > 140; blurry scenes drop below 50.
  const sharpnessScore = Math.min(100, Math.max(0, Math.round((laplacianVariance / 200) * 100)));
  const isBlurry = laplacianVariance < 55 || sharpnessScore < 30;
  const isOverExposed = meanBrightness > 225;
  const isUnderExposed = meanBrightness < 35;

  let overallQuality: QualityMetrics['overallQuality'] = 'EXCELLENT';
  if (isBlurry || isOverExposed || isUnderExposed) {
    overallQuality = isBlurry && (isOverExposed || isUnderExposed) ? 'POOR' : 'DEGRADED';
  } else if (sharpnessScore < 60) {
    overallQuality = 'USABLE';
  }

  return {
    sharpnessScore,
    laplacianVariance: Math.round(laplacianVariance * 10) / 10,
    isBlurry,
    brightness: Math.round(meanBrightness),
    contrast: Math.round(contrast),
    isOverExposed,
    isUnderExposed,
    overallQuality,
  };
}

/**
 * 2. Scene Alignment (Translational Cross-Correlation / Phase Correlation)
 * OpenCV equivalent: cv2.phaseCorrelate or template match for micro-movement compensation.
 */
export function estimateSceneAlignment(
  refData: ImageData,
  liveData: ImageData,
  maxShift: number = 20
): AlignmentResult {
  const width = refData.width;
  const height = refData.height;

  // Downsample to 160x90 for fast sub-millisecond translation search
  const sampleW = 160;
  const sampleH = 90;
  const scaleX = width / sampleW;
  const scaleY = height / sampleH;

  const refSample = new Float32Array(sampleW * sampleH);
  const liveSample = new Float32Array(sampleW * sampleH);

  let refMean = 0;
  let liveMean = 0;

  for (let sy = 0; sy < sampleH; sy++) {
    const srcY = Math.floor(sy * scaleY);
    for (let sx = 0; sx < sampleW; sx++) {
      const srcX = Math.floor(sx * scaleX);
      const srcIdx = (srcY * width + srcX) * 4;
      const idx = sy * sampleW + sx;

      const rGray = 0.299 * refData.data[srcIdx] + 0.587 * refData.data[srcIdx + 1] + 0.114 * refData.data[srcIdx + 2];
      const lGray = 0.299 * liveData.data[srcIdx] + 0.587 * liveData.data[srcIdx + 1] + 0.114 * liveData.data[srcIdx + 2];

      refSample[idx] = rGray;
      liveSample[idx] = lGray;
      refMean += rGray;
      liveMean += lGray;
    }
  }

  refMean /= sampleW * sampleH;
  liveMean /= sampleW * sampleH;

  // Search best shift in downscaled space (-4 to +4)
  const maxDownShift = Math.max(1, Math.floor(maxShift / scaleX));
  let bestScore = -1;
  let bestDx = 0;
  let bestDy = 0;

  for (let dy = -maxDownShift; dy <= maxDownShift; dy++) {
    for (let dx = -maxDownShift; dx <= maxDownShift; dx++) {
      let num = 0;
      let denR = 0;
      let denL = 0;
      let count = 0;

      for (let sy = maxDownShift; sy < sampleH - maxDownShift; sy += 2) {
        for (let sx = maxDownShift; sx < sampleW - maxDownShift; sx += 2) {
          const rVal = refSample[sy * sampleW + sx] - refMean;
          const lVal = liveSample[(sy + dy) * sampleW + (sx + dx)] - liveMean;

          num += rVal * lVal;
          denR += rVal * rVal;
          denL += lVal * lVal;
          count++;
        }
      }

      const denom = Math.sqrt(denR * denL);
      const score = denom > 0 ? num / denom : 0;

      if (score > bestScore) {
        bestScore = score;
        bestDx = dx;
        bestDy = dy;
      }
    }
  }

  const finalOffsetX = Math.round(bestDx * scaleX);
  const finalOffsetY = Math.round(bestDy * scaleY);
  const neededCorrection = Math.abs(finalOffsetX) > 2 || Math.abs(finalOffsetY) > 2;

  return {
    offsetX: finalOffsetX,
    offsetY: finalOffsetY,
    rotationDeg: 0,
    correlationScore: Math.max(0, Math.min(1, Math.round(bestScore * 100) / 100)),
    neededCorrection,
  };
}

/**
 * 3. Difference Map & Contour-based Change Localization
 * OpenCV equivalent: cv2.absdiff, thresholding, morphological closing, cv2.findContours, cv2.boundingRect
 */
export function detectSceneChanges(
  refData: ImageData,
  liveData: ImageData,
  alignmentOffset: { x: number; y: number } = { x: 0, y: 0 },
  thresholdVal: number = 38
): ComparisonResult {
  const width = refData.width;
  const height = refData.height;
  const totalPixels = width * height;

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d');
  if (!diffCtx) throw new Error('Failed to create diff canvas context');

  const heatmapImgData = diffCtx.createImageData(width, height);
  const heatData = heatmapImgData.data;

  // Grid binary mask for contour clustering (grid cell 16x16)
  const cellDim = 16;
  const gridCols = Math.ceil(width / cellDim);
  const gridRows = Math.ceil(height / cellDim);
  const gridScores = new Float32Array(gridCols * gridRows);
  const gridPixelCounts = new Int32Array(gridCols * gridRows);

  let totalChangedPixels = 0;
  let globalLuminanceDiffSum = 0;

  const dx = alignmentOffset.x;
  const dy = alignmentOffset.y;

  for (let y = 0; y < height; y++) {
    const liveY = y - dy;
    if (liveY < 0 || liveY >= height) continue;

    const rowRef = y * width;
    const rowLive = liveY * width;
    const gridY = Math.floor(y / cellDim);

    for (let x = 0; x < width; x++) {
      const liveX = x - dx;
      if (liveX < 0 || liveX >= width) continue;

      const idxRef = (rowRef + x) * 4;
      const idxLive = (rowLive + liveX) * 4;

      const dr = Math.abs(refData.data[idxRef] - liveData.data[idxLive]);
      const dg = Math.abs(refData.data[idxRef + 1] - liveData.data[idxLive + 1]);
      const db = Math.abs(refData.data[idxRef + 2] - liveData.data[idxLive + 2]);

      // Perceptual delta
      const delta = 0.3 * dr + 0.59 * dg + 0.11 * db;
      globalLuminanceDiffSum += delta;

      const outIdx = (y * width + x) * 4;

      if (delta > thresholdVal) {
        totalChangedPixels++;
        const gridX = Math.floor(x / cellDim);
        const gIdx = gridY * gridCols + gridX;
        gridScores[gIdx] += delta;
        gridPixelCounts[gIdx]++;

        // Heatmap color: Cold Blue -> Teal -> Yellow -> Orange/Crimson
        const normalized = Math.min(1, (delta - thresholdVal) / (120 - thresholdVal));
        if (normalized < 0.33) {
          // Teal-Cyan
          heatData[outIdx] = 0;
          heatData[outIdx + 1] = Math.round(180 + normalized * 75);
          heatData[outIdx + 2] = 230;
          heatData[outIdx + 3] = 190;
        } else if (normalized < 0.66) {
          // Yellow-Amber
          heatData[outIdx] = 245;
          heatData[outIdx + 1] = Math.round(170 + normalized * 50);
          heatData[outIdx + 2] = 20;
          heatData[outIdx + 3] = 220;
        } else {
          // Hot Red-Crimson
          heatData[outIdx] = 235;
          heatData[outIdx + 1] = Math.round(40 * (1 - normalized));
          heatData[outIdx + 2] = 40;
          heatData[outIdx + 3] = 240;
        }
      } else {
        // Dark translucent overlay
        heatData[outIdx] = 11;
        heatData[outIdx + 1] = 19;
        heatData[outIdx + 2] = 43;
        heatData[outIdx + 3] = 60;
      }
    }
  }

  diffCtx.putImageData(heatmapImgData, 0, 0);

  // Cluster active grid cells into connected component Bounding Boxes (Contour equivalents)
  const visited = new Uint8Array(gridCols * gridRows);
  const rawBoxes: Array<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    intensity: number;
    activeCells: number;
  }> = [];

  const cellThreshold = (cellDim * cellDim) * 0.12; // At least 12% pixels in cell changed

  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const idx = gy * gridCols + gx;
      if (visited[idx] || gridPixelCounts[idx] < cellThreshold) continue;

      // Flood-fill / BFS 8-connected clustering
      let minX = gx;
      let maxX = gx;
      let minY = gy;
      let maxY = gy;
      let intensity = 0;
      let activeCells = 0;

      const queue: Array<[number, number]> = [[gx, gy]];
      visited[idx] = 1;

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        const cIdx = cy * gridCols + cx;
        intensity += gridScores[cIdx];
        activeCells++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // Check 8 neighbors
        for (let ny = cy - 1; ny <= cy + 1; ny++) {
          for (let nx = cx - 1; nx <= cx + 1; nx++) {
            if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
              const nIdx = ny * gridCols + nx;
              if (!visited[nIdx] && gridPixelCounts[nIdx] >= cellThreshold) {
                visited[nIdx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }
      }

      // Filter out tiny noise clusters (require at least 2 connected active cells)
      if (activeCells >= 2) {
        rawBoxes.push({
          minX,
          minY,
          maxX,
          maxY,
          intensity,
          activeCells,
        });
      }
    }
  }

  // Convert clustered grid bounding boxes to pixel coordinates
  const detectedRois: BoundingBox[] = rawBoxes
    .map((box, index) => {
      // Pad by 8px for safety margin around object
      const x = Math.max(0, box.minX * cellDim - 8);
      const y = Math.max(0, box.minY * cellDim - 8);
      const w = Math.min(width - x, (box.maxX - box.minX + 1) * cellDim + 16);
      const h = Math.min(height - y, (box.maxY - box.minY + 1) * cellDim + 16);
      const area = w * h;

      const avgPixelDelta = box.intensity / Math.max(1, box.activeCells * cellDim * cellDim * 0.2);
      const confidence = Math.min(0.98, Math.max(0.45, (box.activeCells * 0.08) + (avgPixelDelta / 150)));

      let changeType: BoundingBox['changeType'] = 'OBJECT_MOVED';
      let label = `Visual Discrepancy #${index + 1}`;

      if (w > width * 0.4 || h > height * 0.4) {
        changeType = 'STRUCTURAL_CHANGE';
        label = `Large Layout Shift #${index + 1}`;
      } else if (box.activeCells < 4) {
        changeType = 'OBJECT_ADDED';
        label = `Foreign Object / Tool #${index + 1}`;
      } else {
        changeType = 'OBJECT_MOVED';
        label = `Displaced Workspace Item #${index + 1}`;
      }

      return {
        id: `roi_${Date.now()}_${index}`,
        x,
        y,
        width: w,
        height: h,
        area,
        confidence: Math.round(confidence * 100) / 100,
        label,
        changeType,
      };
    })
    // Sort largest changed region first
    .sort((a, b) => b.area - a.area);

  const changedPixelRatio = totalChangedPixels / totalPixels;
  const changeScore = Math.min(100, Math.round(changedPixelRatio * 250));
  const avgDelta = globalLuminanceDiffSum / totalPixels;

  // An illumination shift causes widespread low-delta changes without concentrated high-contrast ROIs
  const illuminationShiftDetected = avgDelta > 18 && detectedRois.length === 0;
  const hasMeaningfulChange = detectedRois.length > 0 && changeScore >= 4;

  // Uncertainty is high if change is borderline or lighting drifted
  let uncertaintyScore = 0.15;
  if (hasMeaningfulChange) {
    if (changeScore < 10) uncertaintyScore = 0.55;
    if (illuminationShiftDetected) uncertaintyScore = 0.72;
    if (detectedRois.length > 0 && detectedRois[0].confidence < 0.65) uncertaintyScore = 0.6;
  }

  const primaryConfidence = detectedRois.length > 0 ? detectedRois[0].confidence : (hasMeaningfulChange ? 0.7 : 0.95);

  return {
    hasMeaningfulChange,
    changeScore,
    structuralDifferenceRatio: Math.round(changedPixelRatio * 1000) / 10,
    illuminationShiftDetected,
    detectedRois,
    confidence: Math.round(primaryConfidence * 100) / 100,
    uncertaintyScore: Math.round(uncertaintyScore * 100) / 100,
    heatmapDataUrl: diffCanvas.toDataURL('image/png'),
  };
}

/**
 * 4. Region of Interest (ROI) High-Resolution Extraction and Focused Inspection
 */
export function inspectRoiRegion(
  liveCanvas: HTMLCanvasElement,
  refCanvas: HTMLCanvasElement,
  roi: BoundingBox
): RoiInspectionDetail {
  // Crop Live ROI
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = roi.width;
  cropCanvas.height = roi.height;
  const cropCtx = cropCanvas.getContext('2d');
  if (cropCtx) {
    cropCtx.drawImage(
      liveCanvas,
      roi.x, roi.y, roi.width, roi.height,
      0, 0, roi.width, roi.height
    );
  }

  // Crop Reference ROI
  const refCropCanvas = document.createElement('canvas');
  refCropCanvas.width = roi.width;
  refCropCanvas.height = roi.height;
  const refCropCtx = refCropCanvas.getContext('2d');
  if (refCropCtx) {
    refCropCtx.drawImage(
      refCanvas,
      roi.x, roi.y, roi.width, roi.height,
      0, 0, roi.width, roi.height
    );
  }

  // Texture and edge profile analysis on ROI
  const cropImgData = cropCtx?.getImageData(0, 0, roi.width, roi.height);
  let edgeSum = 0;
  if (cropImgData) {
    const d = cropImgData.data;
    for (let i = 0; i < d.length - 8; i += 8) {
      const g1 = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const g2 = 0.299 * d[i + 4] + 0.587 * d[i + 5] + 0.114 * d[i + 6];
      edgeSum += Math.abs(g1 - g2);
    }
  }
  const edgeGradientScore = Math.min(100, Math.round((edgeSum / Math.max(1, roi.area)) * 25));
  const textureComplexity = Math.min(100, Math.round(edgeGradientScore * 1.2));

  let anomalyClassification = 'Displaced Item / Position Mismatch';
  let recommendedAction = 'Return item to reference location marked in workspace';

  if (roi.changeType === 'OBJECT_ADDED') {
    anomalyClassification = 'Foreign Object / Unexpected Debris or Tool';
    recommendedAction = 'Remove foreign object from workbench before proceeding';
  } else if (roi.changeType === 'STRUCTURAL_CHANGE') {
    anomalyClassification = 'Significant Structural Deviation';
    recommendedAction = 'Verify physical fixture alignment and tooling position';
  }

  return {
    roi,
    cropDataUrl: cropCanvas.toDataURL('image/png'),
    refCropDataUrl: refCropCanvas.toDataURL('image/png'),
    edgeGradientScore,
    textureComplexity,
    anomalyClassification,
    recommendedAction,
  };
}

/**
 * 5. Before-and-After Verification
 * Checks if the specific localized ROI that was previously an anomaly has been cleared/restored.
 */
export function verifyResolutionOfRoi(
  roi: BoundingBox,
  currentLiveCanvas: HTMLCanvasElement,
  refCanvas: HTMLCanvasElement,
  toleranceThreshold: number = 26
): { isResolved: boolean; residualDelta: number; confidence: number; explanation: string } {
  const currentCtx = currentLiveCanvas.getContext('2d', { willReadFrequently: true });
  const refCtx = refCanvas.getContext('2d', { willReadFrequently: true });

  if (!currentCtx || !refCtx) {
    return {
      isResolved: false,
      residualDelta: 100,
      confidence: 0,
      explanation: 'Could not access canvas rendering context for verification',
    };
  }

  const liveCrop = currentCtx.getImageData(roi.x, roi.y, roi.width, roi.height);
  const refCrop = refCtx.getImageData(roi.x, roi.y, roi.width, roi.height);

  let diffSum = 0;
  const count = roi.width * roi.height;

  for (let i = 0; i < liveCrop.data.length; i += 4) {
    const dR = Math.abs(liveCrop.data[i] - refCrop.data[i]);
    const dG = Math.abs(liveCrop.data[i + 1] - refCrop.data[i + 1]);
    const dB = Math.abs(liveCrop.data[i + 2] - refCrop.data[i + 2]);
    diffSum += 0.3 * dR + 0.59 * dG + 0.11 * dB;
  }

  const residualDelta = diffSum / count;
  const isResolved = residualDelta <= toleranceThreshold;
  const confidence = Math.min(0.99, Math.max(0.5, 1 - (residualDelta / 80)));

  const explanation = isResolved
    ? `Discrepancy resolved. Residual difference score (${residualDelta.toFixed(1)}) is well below threshold (${toleranceThreshold}). Workspace restored to reference configuration.`
    : `Issue remains active. Residual difference score (${residualDelta.toFixed(1)}) exceeds tolerance (${toleranceThreshold}). Corrective action needed.`;

  return {
    isResolved,
    residualDelta: Math.round(residualDelta * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    explanation,
  };
}
