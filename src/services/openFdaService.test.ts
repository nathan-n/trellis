/// <reference types="vitest/globals" />
import { stripHtml, truncate, searchTextForDrugName } from './openFdaService';

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
  });

  it('collapses whitespace', () => {
    expect(stripHtml('<p>  Hello   World  </p>')).toBe('Hello World');
  });

  it('handles nested tags', () => {
    expect(stripHtml('<div><span>A</span> <b>B</b></div>')).toBe('A B');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });

  it('passes through plain text unchanged', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });
});

describe('truncate', () => {
  it('returns full text when under max length', () => {
    expect(truncate('short text', 100)).toBe('short text');
  });

  it('truncates at sentence boundary when possible', () => {
    const text = 'First sentence. Second sentence. Third sentence is much longer.';
    const result = truncate(text, 40);
    expect(result).toContain('First sentence.');
    expect(result).toContain('...');
  });

  it('truncates at max when no good sentence boundary', () => {
    const text = 'A'.repeat(100);
    const result = truncate(text, 50);
    expect(result.length).toBeLessThanOrEqual(54); // 50 + '...'
    expect(result).toContain('...');
  });

  it('strips HTML before truncating', () => {
    const result = truncate('<p>Hello world</p>', 100);
    expect(result).toBe('Hello world');
    expect(result).not.toContain('<');
  });

  it('adds ellipsis when truncated', () => {
    const text = 'This is a long piece of text that should be truncated somewhere';
    expect(truncate(text, 20)).toContain('...');
  });
});

describe('searchTextForDrugName', () => {
  it('finds drug name case-insensitively', () => {
    const result = searchTextForDrugName('Do not use with Metformin because of risk', ['metformin']);
    expect(result).not.toBeNull();
    expect(result).toContain('Metformin');
  });

  it('extracts surrounding context', () => {
    const longText = 'A'.repeat(200) + ' Metformin interaction ' + 'B'.repeat(200);
    const result = searchTextForDrugName(longText, ['metformin']);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThan(longText.length);
    expect(result).toContain('Metformin');
  });

  it('skips names shorter than 3 characters', () => {
    const result = searchTextForDrugName('Take with AB compound', ['ab']);
    expect(result).toBeNull();
  });

  it('returns null when no match found', () => {
    const result = searchTextForDrugName('This is a safe drug', ['aspirin']);
    expect(result).toBeNull();
  });

  it('returns first matching name context', () => {
    const result = searchTextForDrugName('Warning about ibuprofen usage', ['aspirin', 'ibuprofen']);
    expect(result).not.toBeNull();
    expect(result).toContain('ibuprofen');
  });

  it('handles match at the very start of text', () => {
    const result = searchTextForDrugName('Metformin should not be used', ['metformin']);
    expect(result).not.toBeNull();
  });

  it('handles empty names array', () => {
    const result = searchTextForDrugName('Some text', []);
    expect(result).toBeNull();
  });
});
