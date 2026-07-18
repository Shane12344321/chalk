import type { LayoutBox } from "./layout";

export interface FittedBoardText {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  startY: number;
  fits: boolean;
}

export function fitBoardText(text: string, box: LayoutBox): FittedBoardText {
  for (const fontSize of [43, 38, 34, 30, 27, 24, 21, 18]) {
    const maxChars = Math.max(1, Math.floor(box.width / (fontSize * 0.58)));
    const lines = wrapBoardText(text, maxChars);
    const lineHeight = fontSize * 1.08;
    if (
      lines.length * lineHeight <= box.height &&
      lines.every((line) => line.length * fontSize * 0.58 <= box.width)
    ) {
      const blockHeight = lines.length * lineHeight;
      return {
        lines,
        fontSize,
        lineHeight,
        startY: box.y + (box.height - blockHeight) / 2 + fontSize * 0.82,
        fits: true,
      };
    }
  }
  const fontSize = 18;
  const lineHeight = fontSize * 1.08;
  const lines = wrapBoardText(text, Math.max(1, Math.floor(box.width / (fontSize * 0.58))));
  return {
    lines,
    fontSize,
    lineHeight,
    startY: box.y + fontSize * 0.82,
    fits:
      lines.length * lineHeight <= box.height &&
      lines.every((line) => line.length * fontSize * 0.58 <= box.width),
  };
}

function wrapBoardText(text: string, maxChars: number): string[] {
  return text.split("\n").flatMap((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if (!line || `${line} ${word}`.length <= maxChars) {
        line = line ? `${line} ${word}` : word;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  });
}
