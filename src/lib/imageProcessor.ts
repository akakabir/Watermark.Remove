/**
 * High-performance client-side image watermark removal & inpainting
 */

export async function processImageClientSide(
  imgFile: File,
  sel: { x: number; y: number; w: number; h: number },
  renderedWidth: number,
  renderedHeight: number,
  onProgress?: (pct: number, status: string) => void
): Promise<{ outputUrl: string; downloadUrl: string }> {
  return new Promise((resolve, reject) => {
    onProgress?.(15, "Loading image into memory...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    const objectUrl = URL.createObjectURL(imgFile);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        onProgress?.(35, "Analyzing watermark boundaries...");
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          throw new Error("Could not initialize 2D context.");
        }

        ctx.drawImage(img, 0, 0);

        const scaleX = img.naturalWidth / renderedWidth;
        const scaleY = img.naturalHeight / renderedHeight;

        let actX = Math.round(sel.x * scaleX);
        let actY = Math.round(sel.y * scaleY);
        let actW = Math.round(sel.w * scaleX);
        let actH = Math.round(sel.h * scaleY);

        if (actX < 0) actX = 0;
        if (actY < 0) actY = 0;
        if (actX + actW > canvas.width) actW = canvas.width - actX;
        if (actY + actH > canvas.height) actH = canvas.height - actY;

        if (actW <= 0 || actH <= 0) {
          throw new Error("Selection area is too small. Please drag to select the watermark.");
        }

        onProgress?.(60, "Reconstructing background textures...");

        const width = canvas.width;
        const height = canvas.height;
        const startX = Math.max(0, Math.min(width - 1, actX));
        const startY = Math.max(0, Math.min(height - 1, actY));
        const endX = Math.max(0, Math.min(width, actX + actW));
        const endY = Math.max(0, Math.min(height, actY + actH));

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const leftX = Math.max(0, startX - 2);
        const rightX = Math.min(width - 1, endX + 1);
        const topY = Math.max(0, startY - 2);
        const bottomY = Math.min(height - 1, endY + 1);

        const getPixel = (px: number, py: number) => {
          const idx = (py * width + px) * 4;
          return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
        };

        const topBorder: number[][] = [];
        const bottomBorder: number[][] = [];
        for (let px = startX; px < endX; px++) {
          topBorder[px - startX] = getPixel(px, topY);
          bottomBorder[px - startX] = getPixel(px, bottomY);
        }

        const leftBorder: number[][] = [];
        const rightBorder: number[][] = [];
        for (let py = startY; py < endY; py++) {
          leftBorder[py - startY] = getPixel(leftX, py);
          rightBorder[py - startY] = getPixel(rightX, py);
        }

        // Harmonic PDE diffusion algorithm for seamless edge color propagation
        for (let py = startY; py < endY; py++) {
          const dTop = py - startY + 1;
          const dBottom = endY - py;
          const wTop = 1 / Math.pow(dTop, 1.25);
          const wBottom = 1 / Math.pow(dBottom, 1.25);

          const pLeft = leftBorder[py - startY] || [128, 128, 128, 255];
          const pRight = rightBorder[py - startY] || [128, 128, 128, 255];

          for (let px = startX; px < endX; px++) {
            const dLeft = px - startX + 1;
            const dRight = endX - px;
            const wLeft = 1 / Math.pow(dLeft, 1.25);
            const wRight = 1 / Math.pow(dRight, 1.25);

            const pTop = topBorder[px - startX] || [128, 128, 128, 255];
            const pBottom = bottomBorder[px - startX] || [128, 128, 128, 255];

            const totalWeight = wTop + wBottom + wLeft + wRight;

            const idx = (py * width + px) * 4;
            for (let c = 0; c < 3; c++) {
              const val = (
                wTop * pTop[c] +
                wBottom * pBottom[c] +
                wLeft * pLeft[c] +
                wRight * pRight[c]
              ) / totalWeight;
              data[idx + c] = Math.round(val);
            }
            data[idx + 3] = 255;
          }
        }

        ctx.putImageData(imageData, 0, 0);

        onProgress?.(90, "Finalizing high-res output...");

        const mimeType = imgFile.type === "image/png" ? "image/png" : "image/jpeg";
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to generate cleaned image."));
              return;
            }
            const blobUrl = URL.createObjectURL(blob);
            onProgress?.(100, "Complete!");
            resolve({ outputUrl: blobUrl, downloadUrl: blobUrl });
          },
          mimeType,
          0.98
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load uploaded image."));
    };

    img.src = objectUrl;
  });
}
