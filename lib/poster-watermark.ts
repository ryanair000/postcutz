const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
};

function bitmapText(text: string, centerX: number, top: number, pixel: number, fill: string) {
  const glyphWidth = 5 * pixel;
  const spacing = pixel;
  const textWidth = text.length * (glyphWidth + spacing) - spacing;
  const left = centerX - textWidth / 2;
  const paths: string[] = [];

  for (const [charIndex, character] of [...text.toUpperCase()].entries()) {
    const glyph = GLYPHS[character];
    if (!glyph) continue;
    for (const [rowIndex, row] of glyph.entries()) {
      for (const [columnIndex, value] of [...row].entries()) {
        if (value !== "1") continue;
        const x = left + charIndex * (glyphWidth + spacing) + columnIndex * pixel;
        const y = top + rowIndex * pixel;
        paths.push(`M${x} ${y}h${pixel}v${pixel}h-${pixel}z`);
      }
    }
  }

  return `<path d="${paths.join("")}" fill="${fill}"/>`;
}

export function buildPosterWatermarkSvg(width: number, height: number) {
  const rows = [0.1, 0.38, 0.66, 0.94];
  const columns = [0.08, 0.5, 0.92];
  const repeatedPixel = Math.max(2.2, width / 330);
  const repeatedMarks = rows.flatMap((row) => columns.map((column) => {
    const centerX = Math.round(width * column);
    const top = Math.round(height * row);
    return `<g transform="rotate(-28 ${centerX} ${top})">${bitmapText("POSTCUTZ PREVIEW", centerX, top, repeatedPixel, "rgba(255,255,255,0.38)")}</g>`;
  })).join("");
  const footerHeight = Math.max(58, Math.round(height * 0.065));
  const centerPixel = Math.max(3, width / 255);
  const footerPixel = Math.max(1.7, width / 520);

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${repeatedMarks}
      <rect x="${Math.round(width * 0.21)}" y="${Math.round(height * 0.455)}"
        width="${Math.round(width * 0.58)}" height="${Math.round(height * 0.09)}"
        rx="${Math.max(12, Math.round(height * 0.02))}" fill="rgba(16,17,15,0.62)"
        stroke="rgba(255,255,255,0.48)" stroke-width="1.4"/>
      ${bitmapText("POSTCUTZ PREVIEW", width / 2, height / 2 - centerPixel * 3.5, centerPixel, "#ffffff")}
      <rect x="0" y="${Math.max(0, height - footerHeight)}" width="${width}" height="${footerHeight}"
        fill="rgba(16,17,15,0.88)"/>
      ${bitmapText("PREVIEW ONLY UNLOCK TO DOWNLOAD", width * 0.33, height - footerHeight / 2 - footerPixel * 3.5, footerPixel, "#ffffff")}
      <circle cx="${width - 38}" cy="${height - footerHeight / 2}" r="18" fill="#d9ff42"/>
      ${bitmapText("JB", width - 38, height - footerHeight / 2 - 7, 2, "#10110f")}
    </svg>`);
}
