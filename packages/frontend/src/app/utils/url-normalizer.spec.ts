import { describe, it, expect } from 'vitest';
import { sanitizeGiteaUrl } from './url-normalizer';

describe('sanitizeGiteaUrl', () => {
  it('should return empty string for null, undefined, or empty inputs', () => {
    expect(sanitizeGiteaUrl(null)).toBe('');
    expect(sanitizeGiteaUrl(undefined)).toBe('');
    expect(sanitizeGiteaUrl('')).toBe('');
    expect(sanitizeGiteaUrl('   ')).toBe('');
  });

  it('should transform internal docker http://cacophony-gitea:3000 URLs to localhost:19634', () => {
    const input = 'http://cacophony-gitea:3000/NeXeN/cacophony/pulls/42';
    const expected = 'http://localhost:19634/NeXeN/cacophony/pulls/42';
    expect(sanitizeGiteaUrl(input)).toBe(expected);
  });

  it('should transform cacophony-gitea:// custom scheme URLs to localhost:19634', () => {
    const input = 'cacophony-gitea://NeXeN/cacophony/pulls/108';
    const expected = 'http://localhost:19634/NeXeN/cacophony/pulls/108';
    expect(sanitizeGiteaUrl(input)).toBe(expected);
  });

  it('should transform cacophony-gitea://host:port/... URLs', () => {
    const input = 'cacophony-gitea://cacophony-gitea:3000/NeXeN/cacophony/pulls/99';
    const expected = 'http://localhost:19634/NeXeN/cacophony/pulls/99';
    expect(sanitizeGiteaUrl(input)).toBe(expected);
  });

  it('should leave already valid localhost URLs untouched', () => {
    const input = 'http://localhost:19634/NeXeN/cacophony/pulls/12';
    expect(sanitizeGiteaUrl(input)).toBe(input);
  });

  it('should leave external GitHub URLs untouched', () => {
    const input = 'https://github.com/Brennername/cacophony/pull/5';
    expect(sanitizeGiteaUrl(input)).toBe(input);
  });
});
