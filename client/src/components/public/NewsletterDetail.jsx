import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './NewsletterDetail.css';

// Newsletters come in two shapes: older ones from the plain textarea are text
// with newlines, newer ones from the rich-text editor are HTML.
// (Ported from src/public/js/individual-newsletter.js)
function NewsletterBody({ content }) {
  const raw = content || '';
  const looksLikeHtml = /<[a-z][^>]*>/i.test(raw);

  if (looksLikeHtml) {
    return <div className="newsletter-text" dangerouslySetInnerHTML={{ __html: raw }} />;
  }

  // Blank line starts a new paragraph, single newline is a line break
  return (
    <div className="newsletter-text">
      {raw.split(/\n\s*\n/).map((block, i) => (
        <p key={i}>
          {block.split('\n').map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function NewsletterDetail() {
  const { id } = useParams();
  const [newsletter, setNewsletter] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/newsletter/${id}`)
      .then(res => res.json())
      .then(data => {
        // the API responds with { message, newsletter } or { error }
        if (data.newsletter) setNewsletter(data.newsletter);
        else setError(data.error || 'Newsletter not found.');
      })
      .catch(() => setError('Could not load this newsletter.'));
  }, [id]);

  if (error) return <div className="newsletter-detail"><p>{error}</p></div>;
  if (!newsletter) return <div className="newsletter-detail"><p>Loading...</p></div>;

  return (
    <div className="newsletter-detail">
      <h1>{newsletter.title}</h1>
      <p className="newsletter-author">Author: {newsletter.author}</p>
      <p className="newsletter-date">Published: {new Date(newsletter.date).toLocaleDateString()}</p>
      {newsletter.image && (
        <img className="newsletter-image" src={newsletter.image} alt="Newsletter" />
      )}
      <NewsletterBody content={newsletter.content} />
    </div>
  );
}

export default NewsletterDetail;
