// Allowlist sanitizer for admin-authored newsletter content.
//
// The newsletter body is written with innerHTML on the public page, so whatever
// is stored here runs in the visitor's browser. Admins are trusted, but a
// compromised admin account should not be able to plant a script on the site.
//
// This is an allowlist: any tag or attribute not named below is removed. It is
// deliberately dependency-free to keep the project self-contained. For a
// hardened guarantee, swap this module for the `sanitize-html` package.

// Tag -> attributes that survive on it. Everything else is dropped.
// <img> is intentionally absent: newsletters carry a separate image field, and
// allowing it here would reopen the onerror= attack.
const ALLOWED_TAGS = {
  b: [], strong: [], i: [], em: [], u: [], s: [], strike: [],
  p: ['style'], div: ['style'], span: ['style'], br: [],
  h1: ['style'], h2: ['style'], h3: ['style'],
  ul: [], ol: [], li: [], blockquote: [],
  a: ['href'],
  font: ['size']
};

// Only these text-align values may travel in a style attribute. Anything else
// in a style (position, background-image, expression, ...) is discarded.
const ALIGN_VALUES = ['left', 'right', 'center', 'justify'];

// Matches one attribute: name="value", name='value', or name=value
const ATTR_PATTERN = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

// A link target is safe if it points at the web, an email, or a page on this
// site. Whitespace and control characters are stripped first so that
// "java\tscript:" cannot sneak past by hiding inside the scheme.
function isSafeHref(value) {
  const cleaned = value.replace(/[\x00-\x20]/g, '').toLowerCase();
  return /^(https?:\/\/|mailto:|\/|#)/.test(cleaned);
}

function keepAttribute(tag, name, value) {
  const allowed = ALLOWED_TAGS[tag];
  if (!allowed.includes(name)) return null;

  if (name === 'href') {
    return isSafeHref(value) ? value : null;
  }

  if (name === 'size') {
    return /^[1-7]$/.test(value) ? value : null;
  }

  if (name === 'style') {
    const match = value.match(/text-align\s*:\s*([a-z]+)/i);
    if (!match) return null;
    const align = match[1].toLowerCase();
    return ALIGN_VALUES.includes(align) ? `text-align: ${align};` : null;
  }

  return null;
}

function escapeAttributeValue(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';

  let html = input;

  // Comments can hide markup from the tag pass below, so they go first.
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Drop script/style along with their contents. Looped because removing an
  // inner tag can splice a new one together: <scr<script>ipt> -> <script>
  let previous;
  do {
    previous = html;
    html = html.replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    html = html.replace(/<\s*(script|style)\b[^>]*>/gi, '');
  } while (html !== previous);

  // Rebuild every remaining tag from the allowlist. Disallowed tags are removed
  // but their text is kept, so stripping <table> does not eat the words inside.
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (tag, name, attrs) => {
    const lower = name.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_TAGS, lower)) return '';

    if (tag.startsWith('</')) return `</${lower}>`;

    const kept = [];
    let attr;
    ATTR_PATTERN.lastIndex = 0;
    while ((attr = ATTR_PATTERN.exec(attrs)) !== null) {
      const attrName = attr[1].toLowerCase();
      const rawValue = attr[2] !== undefined ? attr[2] : attr[3] !== undefined ? attr[3] : attr[4];
      const value = keepAttribute(lower, attrName, rawValue || '');
      if (value !== null) kept.push(`${attrName}="${escapeAttributeValue(value)}"`);
    }

    // Links leave the site, so give them safe rel/target defaults.
    if (lower === 'a' && kept.some(a => a.startsWith('href='))) {
      kept.push('target="_blank"', 'rel="noopener noreferrer"');
    }

    return kept.length ? `<${lower} ${kept.join(' ')}>` : `<${lower}>`;
  });
}

// Plain text version, used for list previews and anywhere HTML would leak.
function stripHtml(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { sanitizeHtml, stripHtml };
