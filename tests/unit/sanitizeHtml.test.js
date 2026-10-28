const { sanitizeHtml, stripHtml } = require('../../src/util/sanitizeHtml');

describe('sanitizeHtml utility', () => {
  test('returns empty string for non-string input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml(123)).toBe('');
  });

  test('preserves allowed formatting tags', () => {
    const input = '<p>Hello <b>world</b> and <i>friends</i>!</p>';
    expect(sanitizeHtml(input)).toBe('<p>Hello <b>world</b> and <i>friends</i>!</p>');
  });

  test('removes script, style, and nested script tags', () => {
    const input = '<p>Safe</p><script>alert(1)</script><style>body{display:none}</style><scr<script>alert(2)</script>ipt>bad</script>';
    expect(sanitizeHtml(input)).toBe('<p>Safe</p>bad');
  });

  test('strips disallowed tags like img and iframe while keeping text content', () => {
    const input = '<div><img src="x" onerror="alert(1)"><span>Visible text</span></div>';
    expect(sanitizeHtml(input)).toBe('<div><span>Visible text</span></div>');
  });

  test('keeps safe text-align style and discards unsafe styles', () => {
    const valid = '<p style="text-align: center; color: red;">Centered</p>';
    const invalid = '<p style="position: fixed; top: 0;">Normal</p>';
    expect(sanitizeHtml(valid)).toBe('<p style="text-align: center;">Centered</p>');
    expect(sanitizeHtml(invalid)).toBe('<p>Normal</p>');
  });

  test('sanitizes anchor href attributes and adds target/rel defaults', () => {
    const safeLink = '<a href="https://example.com">Visit</a>';
    const unsafeLink = '<a href="javascript:alert(1)">Click</a>';
    expect(sanitizeHtml(safeLink)).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Visit</a>');
    expect(sanitizeHtml(unsafeLink)).toBe('<a>Click</a>');
  });

  test('stripHtml converts markup and entities into normalized plain text', () => {
    expect(stripHtml('<p>Hello&nbsp;<b>PLMB</b>   Portal!</p>')).toBe('Hello PLMB Portal!');
    expect(stripHtml(null)).toBe('');
  });
});
