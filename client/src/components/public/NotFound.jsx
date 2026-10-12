import { Link } from 'react-router-dom';

// Shown for any URL that doesn't match a route (inside the public header/footer)
function NotFound() {
    return (
        <div style={{ maxWidth: 960, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 42, color: '#2C4A2E', marginBottom: 12 }}>Page not found</h2>
            <p style={{ marginBottom: 20 }}>The page you're looking for doesn't exist or has moved.</p>
            <Link to="/" style={{ color: '#3D7A40', fontWeight: 'bold' }}>Back to Home</Link>
        </div>
    );
}

export default NotFound;
