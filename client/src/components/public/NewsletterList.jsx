import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './NewsletterList.css';

// Newsletter bodies are stored as HTML from the editor. Cards show a short
// teaser, so pull the words out first (slicing the markup could cut a tag in half).
function toPlainText(html) {
  if (!html) return '';
  // Closing block tags imply a space, otherwise words from separate paragraphs run together
  const spaced = html.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>|<br\s*\/?>/gi, ' ');
  const parsed = new DOMParser().parseFromString(spaced, 'text/html');
  return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function NewsletterList() {
  const [newsletters, setNewsletters] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/announcements')
      .then(res => res.json())
      // the API responds with { message, newsletters: [...] }, not a bare array
      .then(data => setNewsletters(data.newsletters || []))
      .catch(() => setError('Could not load newsletters.'));
  }, []);

  return (
    <div className="newsletter-page">
      <div className="labels">
        <h1>Newsletter</h1>
        <p>The latest announcements and news from the company.</p>
      </div>

      <section className="newsletter-container">
        {error && <p>{error}</p>}
        {newsletters.map(n => {
          const text = toPlainText(n.content);
          const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
          return (
            <Link to={`/newsletter/${n._id}`} key={n._id}>
              <div className="newsletter-card">
                <h2>{n.title}</h2>
                <p className="newsletter-date">{new Date(n.date).toLocaleDateString()}</p>
                <p className="newsletter-desc">{preview}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

export default NewsletterList;
