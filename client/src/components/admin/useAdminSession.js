import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Checks the admin session cookie by asking the server who is logged in.
// Logged-out visitors are sent to /admin/login.
//
// This only hides the admin screens. The data is protected by requireAuth on the
// server's /api routes, which refuses logged-out requests whatever the page does.
function useAdminSession() {
    const [admin, setAdmin] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('/api/admin/me')
            .then(res => {
                if (!res.ok) throw new Error('Not logged in'); // 401 from requireAuth
                return res.json();
            })
            .then(data => setAdmin(data))
            .catch(() => navigate('/admin/login', { replace: true }));
    }, [navigate]);

    return [admin, setAdmin];
}

export default useAdminSession;
