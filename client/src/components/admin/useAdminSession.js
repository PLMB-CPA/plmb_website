import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Checks the admin session cookie by asking the server who is logged in.
// Returns the username once known, or null while the check is still running.
// Logged-out visitors are sent to /admin/login.
//
// Used by AdminLayout (covers every page with the sidebar) and by AdminCreation
// (which has no sidebar, so it sits outside the layout and needs its own check).
//
// This only hides the admin screens. The data is protected by requireAuth on the
// server's /api routes, which refuses logged-out requests whatever the page does.
function useAdminSession() {
    const [username, setUsername] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('/api/admin/username')
            .then(res => {
                if (!res.ok) throw new Error('Not logged in'); // 401 from requireAuth
                return res.json();
            })
            .then(data => setUsername(data.username))
            .catch(() => navigate('/admin/login', { replace: true }));
    }, [navigate]);

    return username;
}

export default useAdminSession;
