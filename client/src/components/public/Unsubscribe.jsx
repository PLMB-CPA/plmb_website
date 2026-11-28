import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function Unsubscribe() {
    const { token } = useParams();
    const [status, setStatus] = useState('idle');

    async function handleUnsubscribe() {
        setStatus('saving');
        try {
            const res = await fetch('/api/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            setStatus(res.ok ? 'done' : res.status === 404 ? 'invalid' : 'error');
        } catch {
            setStatus('error');
        }
    }

    return (
        <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
            <h1>Unsubscribe</h1>
            {status === 'done' ? (
                <p>You have been unsubscribed from PLMB newsletters.</p>
            ) : status === 'invalid' ? (
                <p>This unsubscribe link is not valid.</p>
            ) : (
                <>
                    <p>Stop receiving PLMB newsletters at this email address?</p>
                    {status === 'error' && <p style={{ color: '#b42318' }}>Something went wrong, please try again.</p>}
                    <button type="button" onClick={handleUnsubscribe} disabled={status === 'saving'}>
                        {status === 'saving' ? 'Saving...' : 'Confirm unsubscribe'}
                    </button>
                </>
            )}
            <p><Link to="/">Back to home</Link></p>
        </div>
    );
}

export default Unsubscribe;
