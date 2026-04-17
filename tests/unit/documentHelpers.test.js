import { describe, it, expect } from 'vitest';
import {
  canon,
  buildIndex,
  get,
  firstUrl,
  mapDoc,
  secopFingerprint,
} from '../../src/utils/documentHelpers.js';

describe('canon', () => {
  it('strips accents, non-alphanumerics, and lowercases', () => {
    expect(canon('Descripción_del_Proceso')).toBe('descripciondelproceso');
    expect(canon('ID-Portafolio')).toBe('idportafolio');
    expect(canon('')).toBe('');
    expect(canon(null)).toBe('');
  });
});

describe('buildIndex + get', () => {
  const item = {
    'ID_Portafolio': 'ABC-1',
    'Descripción': 'texto largo',
    'Valor': '',
  };

  it('builds a canonical map and resolves variants', () => {
    const idx = buildIndex(item);
    expect(get(item, idx, ['id_del_portafolio', 'ID_Portafolio'])).toBe('ABC-1');
    expect(get(item, idx, ['descripcion'])).toBe('texto largo');
  });

  it('skips empty strings and returns fallback', () => {
    const idx = buildIndex(item);
    expect(get(item, idx, ['Valor'], 'DEFAULT')).toBe('DEFAULT');
    expect(get(item, idx, ['no_existe'], null)).toBeNull();
  });
});

describe('firstUrl', () => {
  it('returns the first valid http string', () => {
    expect(firstUrl(null, '', 'https://example.com/x', 'http://b')).toBe(
      'https://example.com/x'
    );
  });

  it('unwraps object {url: "..."}', () => {
    expect(firstUrl({ url: 'https://x.test' })).toBe('https://x.test');
  });

  it('returns null when nothing matches', () => {
    expect(firstUrl(null, '', 'not-a-url', { url: 'ftp://x' })).toBeNull();
  });
});

describe('mapDoc', () => {
  it('picks titulo from the first available field', () => {
    const m = mapDoc({ nombre_documento: 'Pliego.pdf', url: 'https://x/pliego' });
    expect(m.titulo).toBe('Pliego.pdf');
    expect(m.url).toBe('https://x/pliego');
  });

  it('defaults to "Documento" when no name fields exist', () => {
    expect(mapDoc({}).titulo).toBe('Documento');
  });
});

describe('secopFingerprint', () => {
  it('builds DocumentId/DocUniqueIdentifier fingerprint for SECOP urls', () => {
    const url =
      'https://community.secop.gov.co/Public/Common/DocumentViewer.aspx?DocumentId=123&DocUniqueIdentifier=abc';
    expect(secopFingerprint(url)).toBe('secop:123:abc');
  });

  it('falls back to filename for SECOP urls without ids', () => {
    const url = 'https://community.secop.gov.co/assets/files/pliego.pdf';
    expect(secopFingerprint(url)).toContain('secopfile:');
  });

  it('returns empty string for null/undefined', () => {
    expect(secopFingerprint(null)).toBe('');
    expect(secopFingerprint(undefined)).toBe('');
  });
});
