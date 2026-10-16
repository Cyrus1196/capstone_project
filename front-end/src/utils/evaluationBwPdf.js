import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Convert a canvas to grayscale JPEG (much smaller than PNG color screenshots).
 */
export function canvasToGrayscaleJpeg(canvas, quality = 0.72) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas.toDataURL('image/jpeg', quality);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Render an off-screen HTML report into a black-and-white JPEG PDF.
 * @param {string} html
 * @param {{ filename?: string, widthPx?: number, scale?: number, orientation?: 'portrait'|'landscape', jpegQuality?: number }} options
 */
export async function downloadBwHtmlAsPdf(html, options = {}) {
  const {
    filename = 'evaluation-report.pdf',
    widthPx = 980,
    scale = 1.35,
    orientation = 'landscape',
    jpegQuality = 0.7,
  } = options;

  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    left: '-12000px',
    top: '0',
    width: `${widthPx}px`,
    background: '#ffffff',
  });
  el.innerHTML = html;
  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    const imgData = canvasToGrayscaleJpeg(canvas, jpegQuality);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage(undefined, orientation);
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(el);
  }
}
