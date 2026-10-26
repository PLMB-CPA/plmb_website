import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import useClickOutside from './useClickOutside';
import './AdminManagement.css';

// Replaces src/views/admin_management.html + public/js/admin_management.js

// One admin in the list, with its own ⋮ menu
function AdminRow({ admin, onDelete }) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useClickOutside(() => setMenuOpen(false));

    return (
        <div className="user-row">
            <div className="user-info">
                <h3>{admin.username}</h3>
                <p></p>
            </div>
            <div className="status active">
                <p>● Active</p>
            </div>
            {/* Per-admin stats (inquiries answered, newsletters reviewed/published)
                go here once the backend tracks them */}
            <div className="dropdown-btn" ref={menuRef}>
                <button type="button" className="more-btn" onClick={() => setMenuOpen(!menuOpen)}>⋮</button>
                <div className={`dropdown-content ${menuOpen ? 'show' : ''}`}>
                    <button type="button" className="change-pass-ad"
                        onClick={() => navigate(`/admin/manage/create?mode=change&id=${admin._id}`)}>
                        Change Password
                    </button>
                    <button type="button" className="delete-ad" onClick={() => onDelete(admin._id)}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function AdminManagement() {
    const navigate = useNavigate();
    const [admins, setAdmins] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/admin/users')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAdmins(data);
                else setError(data.error || 'Failed to load admins.');
            })
            .catch(() => setError('Failed to load admins.'));
    }, []);

    async function handleDelete(id) {
        if (!window.confirm('Are you sure you want to delete this admin?')) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) {
                window.alert(data.error);
                return;
            }
            window.alert(data.message);
            setAdmins(admins.filter(a => a._id !== id));
        } catch {
            window.alert('Failed to delete admin.');
        }
    }

    return (
        <div className="manage-page">
            <AdminHeader />

            <div className="dashboard-header">
                <div className="labels">
                    <div className="labels-text">
                        <h1>Manage Admin</h1>
                        <p>Add, delete, track, and update admins.</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="admin-section">
                    <div className="content-header">
                        <h1>All Admins</h1>
                        <div className="header-items">
                            <button type="button" className="add-admin-btn"
                                onClick={() => navigate('/admin/manage/create?mode=add')}>
                                Add Admin
                            </button>
                        </div>
                    </div>

                    <div className="admin-list">
                        {error && <p>{error}</p>}
                        {admins.map(admin => (
                            <AdminRow key={admin._id} admin={admin} onDelete={handleDelete} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminManagement;
