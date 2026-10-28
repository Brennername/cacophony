import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  sanitizeGiteaUrl,
  setFrontendHostDomain,
  isContainerId,
} from './url-normalizer';

describe('sanitizeGiteaUrl & url-normalizer', () => {
  beforeEach(() => {
    setFrontendHostDomain(null);
  });

  afterEach(() => {
    setFrontendHostDomain(null);
  });

  it('should return empty string for null, undefined, or empty inputs', () => {
    expect(sanitizeGiteaUrl(null)).toBe('');
    expect(sanitizeGiteaUrl(undefined)).toBe('');
    expect(sanitizeGiteaUrl('')).toBe('');
    expect(sanitizeGiteaUrl('   ')).toBe('');
  });

  it('should recognize container ID hashes', () => {
    expect(isContainerId('ac2c026bbfff')).toBe(true);
    expect(isContainerId('localhost')).toBe(false);
    expect(isContainerId('lan-server.local')).toBe(false);
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

  it('should remap ephemeral container ID hashes to browser host base', () => {
    setFrontendHostDomain('lan-host.local');
    const input = 'http://ac2c026bbfff:19634/NeXeN/cacophony/issues/908';
    const expected = 'http://lan-host.local:19634/NeXeN/cacophony/issues/908';
    expect(sanitizeGiteaUrl(input)).toBe(expected);
  });

  it('should leave already valid localhost URLs untouched when host is localhost', () => {
    const input = 'http://localhost:19634/NeXeN/cacophony/pulls/12';
    expect(sanitizeGiteaUrl(input)).toBe(input);
  });

  it('should leave external GitHub URLs untouched', () => {
    const input = 'https://github.com/Brennername/cacophony/pull/5';
    expect(sanitizeGiteaUrl(input)).toBe(input);
  });
});
