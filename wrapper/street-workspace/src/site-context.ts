import type { CandidateSiteContext } from './types.ts';

type CandidateSiteHandoffV1 = {
  version: 1;
  site: CandidateSiteContext;
  provenance: {
    classification: 'illustrative';
    source: string;
    note: string;
  };
};

export type ParsedSiteHandoff = {
  site: CandidateSiteContext;
  provenance: CandidateSiteHandoffV1['provenance'];
};

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 240;

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 20 && value.every(isText);
}

function decodeBase64Url(value: string): unknown {
  if (value.length > 16_000) throw new Error('Site handoff is too large');
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function isHandoff(value: unknown): value is CandidateSiteHandoffV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const site = candidate.site as Record<string, unknown> | undefined;
  const provenance = candidate.provenance as Record<string, unknown> | undefined;
  const coordinates = site?.coordinates;
  const indicators = site?.indicators as Record<string, unknown> | undefined;
  return candidate.version === 1
    && !!site
    && isText(site.id)
    && isText(site.name)
    && isText(site.district)
    && Array.isArray(coordinates)
    && coordinates.length === 2
    && coordinates.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
    && !!indicators
    && isTextList(indicators.sources)
    && isTextList(indicators.missingData)
    && isTextList(site.constraints)
    && isTextList(site.directions)
    && !!provenance
    && provenance.classification === 'illustrative'
    && isText(provenance.source)
    && isText(provenance.note);
}

export function parseSiteHandoff(search: string): ParsedSiteHandoff | undefined {
  const encoded = new URLSearchParams(search).get('site');
  if (!encoded) return undefined;
  try {
    const value = decodeBase64Url(encoded);
    if (!isHandoff(value)) return undefined;
    return {
      site: structuredClone(value.site),
      provenance: structuredClone(value.provenance),
    };
  } catch {
    return undefined;
  }
}

export function scopingToolUrl(): string {
  const configured = import.meta.env.VITE_SCOPING_TOOL_URL;
  const target = configured || (import.meta.env.DEV
    ? 'http://localhost:5173/data/site-scoping-tool/'
    : '../../data/site-scoping-tool/');
  return new URL(target, window.location.href).toString();
}
