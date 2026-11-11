import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import './AdminManagement.css';

function ClientRow({ client }) {
    return (
        <div className="user-row">
            <div className="user-info">
                <h3>{client.firstName} {client.lastName}</h3>
                <p>{client.businessName} · {client.email}</p>
            </div>
            <div className={`status ${client.mustChangePassword ? 'inactive' : 'active'}`}>
                <p>{client.mustChangePassword ? '● Pending first login' : '● Active'}</p>
            </div>
        </div>
    );
}

function ClientManagement() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/admin/clients')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setClients(data);
                else setError(data.error || 'Failed to load clients.');
            })
            .catch(() => setError('Failed to load clients.'))
            .finally(() => setLoaded(true));
    }, []);

    return (
        <div className="manage-page">
            <AdminHeader />

            <div className="dashboard-header">
                <div className="labels">
                    <div className="labels-text">
                        <h1>Manage Clients</h1>
                        <p>Add and view client portal accounts.</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="admin-section">
                    <div className="content-header">
                        <h1>All Clients</h1>
                        <div className="header-items">
                            <button type="button" className="add-admin-btn"
                                onClick={() => navigate('/admin/clients/new')}>
                                Add Client
                            </button>
                        </div>
                    </div>

                    <div className="admin-list">
                        {error && <p>{error}</p>}
                        {loaded && !error && clients.length === 0 && <p>No clients yet.</p>}
                        {clients.map(c => <ClientRow key={c._id} client={c} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientManagement;
