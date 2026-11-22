import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function useAdminSession() {
    const [admin, setAdmin] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('/api/admin/me')
            .then(res => {
                if (!res.ok) throw new Error('Not logged in');
                return res.json();
            })
            .then(data => setAdmin(data))
            .catch(() => navigate('/admin/login', { replace: true }));
    }, [navigate]);

    return [admin, setAdmin];
}

export default useAdminSession;
