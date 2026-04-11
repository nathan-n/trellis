/// <reference types="vitest/globals" />
import { tokenize, buildSearchTerms } from './searchUtils';

describe('tokenize', () => {
  it('lowercases all tokens', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world']);
  });

  it('strips punctuation', () => {
    expect(tokenize('hello, world!')).toEqual(['hello', 'world']);
  });

  it('splits on whitespace', () => {
    expect(tokenize('one  two   three')).toEqual(['one', 'two', 'three']);
  });

  it('filters out single-char tokens', () => {
    expect(tokenize('I am a developer')).toEqual(['am', 'developer']);
  });

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('handles multiple spaces and tabs', () => {
    expect(tokenize('  hello   world  ')).toEqual(['hello', 'world']);
  });
});

describe('buildSearchTerms', () => {
  it('combines tokens from multiple fields', () => {
    const result = buildSearchTerms('hello world', 'foo bar');
    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('deduplicates tokens across fields', () => {
    const result = buildSearchTerms('hello', 'hello world');
    expect(result.filter((t) => t === 'hello')).toHaveLength(1);
  });

  it('skips null and undefined fields', () => {
    const result = buildSearchTerms(null, undefined, 'hello');
    expect(result).toEqual(['hello']);
  });

  it('returns empty array when all fields are null', () => {
    expect(buildSearchTerms(null, null, undefined)).toEqual([]);
  });
});
