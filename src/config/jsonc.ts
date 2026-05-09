export function stripJsoncComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  let inString = false;
  let stringQuote = "";
  let escaped = false;

  while (i < n) {
    const ch = src[i];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === stringQuote) {
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringQuote = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === "/" && i + 1 < n && src[i + 1] === "/") {
      i += 2;
      while (i < n && src[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && i + 1 < n && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      if (i < n) i += 2;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

export function parseJsonc<T = unknown>(src: string, sourcePath?: string): T {
  const stripped = stripJsoncComments(src);
  try {
    return JSON.parse(stripped) as T;
  } catch (err) {
    const where = sourcePath ? ` in ${sourcePath}` : "";
    throw new Error(`failed to parse JSONC${where}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
