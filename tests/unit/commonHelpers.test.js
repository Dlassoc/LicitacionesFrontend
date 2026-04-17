import { describe, it, expect } from 'vitest';
import {
  normalizeCumpleValue,
  normalizeLicitacionId,
  isValidEmail,
  renderVal,
  previewText,
  isDescriptionKey,
  norm,
  prettyKey,
} from '../../src/utils/commonHelpers.js';

describe('normalizeCumpleValue', () => {
  it('passes booleans through', () => {
    expect(normalizeCumpleValue(true)).toBe(true);
    expect(normalizeCumpleValue(false)).toBe(false);
  });

  it('returns null for nullish', () => {
    expect(normalizeCumpleValue(null)).toBeNull();
    expect(normalizeCumpleValue(undefined)).toBeNull();
    expect(normalizeCumpleValue('')).toBeNull();
  });

  it('maps string truthy forms to true', () => {
    ['1', 'true', 'TRUE', 'yes', 'si', 'S', 't', 'y'].forEach((v) => {
      expect(normalizeCumpleValue(v), `"${v}"`).toBe(true);
    });
  });

  it('maps string falsy forms to false', () => {
    ['0', 'false', 'FALSE', 'no', 'N', 'f'].forEach((v) => {
      expect(normalizeCumpleValue(v), `"${v}"`).toBe(false);
    });
  });

  it('maps numbers (non-zero = true)', () => {
    expect(normalizeCumpleValue(1)).toBe(true);
    expect(normalizeCumpleValue(0)).toBe(false);
    expect(normalizeCumpleValue(-1)).toBe(false);
  });

  it('returns null for unknown strings', () => {
    expect(normalizeCumpleValue('maybe')).toBeNull();
  });
});

describe('normalizeLicitacionId', () => {
  it('trims strings', () => {
    expect(normalizeLicitacionId('  ABC-123  ')).toBe('ABC-123');
  });

  it('coerces numbers to strings', () => {
    expect(normalizeLicitacionId(42)).toBe('42');
  });

  it('returns empty string for nullish', () => {
    expect(normalizeLicitacionId(null)).toBe('');
    expect(normalizeLicitacionId(undefined)).toBe('');
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('info@emergente.com.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('no-at')).toBe(false);
    expect(isValidEmail('two@@at.com')).toBe(false);
    expect(isValidEmail('trailing@dot.')).toBe(false);
    expect(isValidEmail('user@.leadingdot.com')).toBe(false);
    expect(isValidEmail('has space@x.com')).toBe(false);
    expect(isValidEmail('@missing-local.com')).toBe(false);
  });

  it('rejects overly long emails', () => {
    expect(isValidEmail('a'.repeat(255) + '@x.com')).toBe(false);
  });
});

describe('renderVal', () => {
  it('returns "No disponible" for empty/null/undefined', () => {
    expect(renderVal(null)).toBe('No disponible');
    expect(renderVal(undefined)).toBe('No disponible');
    expect(renderVal('')).toBe('No disponible');
    expect(renderVal([])).toBe('No disponible');
  });

  it('joins arrays', () => {
    expect(renderVal(['a', 'b'])).toBe('a, b');
  });

  it('stringifies objects', () => {
    expect(renderVal({ a: 1 })).toBe('{"a":1}');
  });
});

describe('previewText', () => {
  it('truncates long text', () => {
    const long = 'x'.repeat(400);
    const result = previewText(long, 320);
    expect(result.length).toBeLessThanOrEqual(321);
    expect(result).toMatch(/…$/);
  });

  it('keeps short text intact', () => {
    expect(previewText('hola', 320)).toBe('hola');
  });
});

describe('isDescriptionKey', () => {
  it('matches description variants', () => {
    expect(isDescriptionKey('descripcion')).toBe(true);
    expect(isDescriptionKey('Descripción')).toBe(true);
    expect(isDescriptionKey('Descripcion_del_proceso')).toBe(true);
  });

  it('rejects non-description keys', () => {
    expect(isDescriptionKey('titulo')).toBe(false);
  });
});

describe('norm', () => {
  it('lowercases and collapses whitespace', () => {
    expect(norm('  Hello   WORLD  ')).toBe('hello world');
  });
});

describe('prettyKey', () => {
  it('formats snake_case and camelCase keys', () => {
    expect(prettyKey('user_name')).toBe('user name');
    expect(prettyKey('userName')).toBe('user Name');
  });
});
