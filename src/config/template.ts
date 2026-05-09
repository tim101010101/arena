import type { ArgToken, ModelCommand, RenderContext } from "./schema";

function isTruthy(value: string | undefined): boolean {
  return value !== undefined && value !== "";
}

export function renderString(template: string, ctx: RenderContext): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf("{{", i);
    if (open === -1) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, open);
    const close = template.indexOf("}}", open + 2);
    if (close === -1) {
      throw new Error(`unterminated {{ in template at offset ${open}`);
    }
    const tag = template.slice(open + 2, close).trim();
    i = close + 2;

    if (tag.startsWith("#if ")) {
      const varName = tag.slice(4).trim();
      const endTag = "{{/if}}";
      const endIdx = findMatchingEnd(template, i, "#if ", "/if");
      if (endIdx === -1) throw new Error(`unterminated {{#if ${varName}}}`);
      const body = template.slice(i, endIdx);
      if (isTruthy(ctx[varName])) {
        out += renderString(body, ctx);
      }
      i = endIdx + endTag.length;
    } else if (tag === "/if") {
      throw new Error(`unexpected {{/if}} at offset ${open}`);
    } else if (tag.startsWith("#")) {
      throw new Error(`unsupported template directive: {{${tag}}}`);
    } else {
      const value = ctx[tag];
      out += value === undefined ? "" : value;
    }
  }
  return out;
}

function findMatchingEnd(template: string, start: number, openMarker: string, closeMarker: string): number {
  let depth = 1;
  let i = start;
  while (i < template.length) {
    const open = template.indexOf("{{", i);
    if (open === -1) return -1;
    const close = template.indexOf("}}", open + 2);
    if (close === -1) return -1;
    const tag = template.slice(open + 2, close).trim();
    if (tag.startsWith(openMarker)) depth++;
    else if (tag === closeMarker) {
      depth--;
      if (depth === 0) return open;
    }
    i = close + 2;
  }
  return -1;
}

export function renderArgs(tokens: ArgToken[], ctx: RenderContext): string[] {
  const out: string[] = [];
  for (const tok of tokens) {
    if (typeof tok === "string") {
      out.push(renderString(tok, ctx));
    } else if (tok && typeof tok === "object" && "if" in tok) {
      if (isTruthy(ctx[tok.if])) {
        for (const s of renderArgs(tok.then, ctx)) out.push(s);
      }
    } else {
      throw new Error(`invalid arg token: ${JSON.stringify(tok)}`);
    }
  }
  return out;
}

export function renderCommand(cmd: ModelCommand, ctx: RenderContext): string[] {
  return renderArgs(cmd.args, ctx);
}
