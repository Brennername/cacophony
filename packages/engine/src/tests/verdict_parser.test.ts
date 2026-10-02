import { VerdictParser } from '../verdict_parser';
import { expect } from 'chai';

describe('VerdictParser', () => {
  let parser: VerdictParser;

  beforeEach(() => {
    parser = new VerdictParser();
  });

  it('should parse JSON verdict format correctly', () => {
    const input = '{"verdict": "approved", "comment": "All checks passed"}';
    const expectedOutput = { verdict: 'approved', comment: 'All checks passed' };
    expect(parser.parse(input)).to.deep.equal(expectedOutput);
  });

  it('should parse XML verdict format correctly', () => {
    const input = '<verdict><status>approved</status><comment>All checks passed</comment></verdict>';
    const expectedOutput = { verdict: 'approved', comment: 'All checks passed' };
    expect(parser.parse(input)).to.deep.equal(expectedOutput);
  });

  it('should parse plain text verdict format correctly', () => {
    const input = 'Verdict: approved\nComment: All checks passed';
    const expectedOutput = { verdict: 'approved', comment: 'All checks passed' };
    expect(parser.parse(input)).to.deep.equal(expectedOutput);
  });

  it('should handle missing comment in JSON format', () => {
    const input = '{"verdict": "approved"}';
    const expectedOutput = { verdict: 'approved', comment: '' };
    expect(parser.parse(input)).to.deep.equal(expectedOutput);
  });

  it('should handle missing comment in XML format', () => {
    const input = '<verdict><status>approved</status></verdict>';
    const expectedOutput = { verdict: 'approved', comment: '' };
    expect(parser.parse(input)).to.deep.equal(expectedOutput);
  });

  it('should handle missing comment in plain text format', () => {
    const input = 'Verdict: approved';
    const expectedOutput = { verdict: 'approved', comment: '' };
    expect(parser.parse(input)).to.deep.equal(expectedOutput);
  });

  it('should handle unexpected formats gracefully', () => {
    const input = 'Unexpected format';
    const expectedOutput = { verdict: '', comment: '' };
    expect(parser.parse(input)).to.deep.equal(expectedOutput);
  });
});