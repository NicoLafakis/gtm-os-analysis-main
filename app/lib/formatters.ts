// GTM OS Builder - Text Formatting Utilities

/**
 * Strip markdown formatting from AI-generated text
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1')       // Remove *italic*
    .replace(/`(.*?)`/g, '$1')         // Remove `code`
    .replace(/#{1,6}\s?/g, '')         // Remove # headers
    .trim();
};

/**
 * Clean AI response text - remove preambles, join fragmented lines, fix punctuation
 */
export const cleanResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text
    .replace(/^.*?(?:I'll|I will|Let me|Based on|Here's|Here is|After|Now I'll).*?(?:research|search|analyze|create|provide|analysis).*$/gim, "")
    .replace(/^.*?(?:web search|my search|searching|searched).*$/gim, "")
    .replace(/^.*?ICP.*?(?:section|profile|for).*?:?\s*$/gim, "")
    .replace(/^#{1,4}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();

  // Join fragmented lines that are clearly part of the same sentence/paragraph
  // Match: ends with lowercase, comma, quote, or period followed by lowercase next line
  cleaned = cleaned.replace(/([a-z,""'.])\s*\n+(?![A-Z]{2,}[A-Z\s]*$)/gm, "$1 ");
  // Join lines that start with lowercase, punctuation, or continuation words
  cleaned = cleaned.replace(/\n+(?=[a-z,;:""'\-–—])/gm, " ");
  // Join lines starting with common continuation patterns
  cleaned = cleaned.replace(/\n+(with |and |or |but |which |that |for |to |in |on |at |the |a |an |is |are |was |were |has |have |had |appears |indicating |shows |demonstrates )/gim, " $1");

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Fix punctuation outside quotation marks (move comma/period inside)
  cleaned = cleaned.replace(/"([^"]+)"\s*,/g, '"$1,"');
  cleaned = cleaned.replace(/"([^"]+)"\s*\./g, '"$1."');

  return cleaned;
};

/**
 * Clean competitive analysis response - handles table formatting
 */
export const cleanCompetitiveResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  cleaned = cleaned
    .replace(/^.*?(?:I'll|I will|Let me|Based on|Here's|Here is|After|Now I'll).*?(?:research|search|analyze|create|provide|analysis).*$/gim, "")
    .replace(/^.*?(?:web search|my search|searching|searched).*$/gim, "")
    .replace(/^.*?ICP.*?(?:section|profile|for).*?:?\s*$/gim, "")
    .replace(/^#{1,4}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
  const lines = cleaned.split("\n");
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    if (/^\|[\s\-:]+\|/.test(line) || /^[\-:|\s]+$/.test(line)) continue;
    if (line.startsWith("|") && line.endsWith("|")) {
      line = line.slice(1, -1).trim();
    } else if (line.startsWith("|")) {
      line = line.slice(1).trim();
    } else if (line.endsWith("|")) {
      line = line.slice(0, -1).trim();
    }
    line = line.replace(/^[-*•]\s+/, "");
    if (line.includes("|")) {
      line = line.split("|").map(p => p.trim()).join(" | ");
      result.push(line);
    } else if (/^[A-Z][A-Z\s\-:]+$/.test(line) && line.length >= 2 && line.length < 60) {
      result.push(line);
    } else {
      const prevLine = result[result.length - 1];
      if (prevLine && !prevLine.includes("|") && !/^[A-Z][A-Z\s\-:]+$/.test(prevLine)) {
        result[result.length - 1] = prevLine + " " + line;
      } else {
        result.push(line);
      }
    }
  }
  return result.join("\n");
};
