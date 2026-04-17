import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { devLog, devInfo, devDebug } from '../../src/utils/devLog.js';

describe('devLog helpers', () => {
  let logSpy;
  let infoSpy;
  let debugSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('delegates to console in dev mode (Vitest runs with DEV=true)', () => {
    devLog('hello', 42);
    devInfo('info-msg');
    devDebug('debug-msg');

    expect(logSpy).toHaveBeenCalledWith('hello', 42);
    expect(infoSpy).toHaveBeenCalledWith('info-msg');
    expect(debugSpy).toHaveBeenCalledWith('debug-msg');
  });
});
