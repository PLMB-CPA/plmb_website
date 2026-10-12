import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import './Dashboard.css';

// Replaces the <main> of src/views/admin_dashboard.html
// + public/js/admin_dashboard_stats.js + public/js/admin_headname.js

// One card = one of the 4 stat boxes, so the markup isn't copy-pasted 4 times
function StatCard({ to, icon, label, tooltip, value }) {
    return (
        <Link className="card" to={to}>
            <div className="card-header">
                <div className="card-title">
                    <img src={icon} className="card-icon" alt="" />
                    <span>{label}</span>
                </div>
                <div className="tooltip">
                    <img className="info-icon" src="/image/info.png" alt="" />
                    <span className="tooltip-text">{tooltip}</span>
                </div>
            </div>
            <div className="card-body">
                {/* ?? shows a dash while the number is still loading (or failed) */}
                <h2>{value ?? '—'}</h2>
            </div>
        </Link>
    );
}

function Dashboard() {
    const { username } = useOutletContext(); // passed down from AdminLayout
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(() => setStats({})); // leaves every card showing a dash
    }, []);

    return (
        <div className="dashboard-page">
            <div className="welcome-message">
                <div className="welcome-left">
                    <div className="welcome-text">
                        <h1>Welcome back,</h1>
                        <h1 className="head-admin-name">{username}</h1>
                    </div>
                    <p>Here's what's happening today.</p>
                </div>

                <div className="divider"></div>

                <div className="welcome-right">
                    <img id="admin-pfp" src="/image/admin-pfp.png" alt="Admin" />
                    <div className="admin-info">
                        <h3>{username}</h3>
                        <p>Admin Job Role</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <h1>Dashboard</h1>

                <div className="cards">
                    {/* stats?.x = undefined (not a crash) while stats is still null */}
                    <StatCard to="/admin/manage" icon="/image/admin-icon.png" label="Admins"
                        tooltip="Number of administrator accounts with dashboard access."
                        value={stats?.totalAdmins} />
                    <StatCard to="/admin/newsletters" icon="/image/newsletter-icon.png" label="Newsletters"
                        tooltip="Total newsletters currently published on the website."
                        value={stats?.publishedNewsletters} />
                    <StatCard to="/admin/newsletters" icon="/image/newsletter-review.png" label="Pending Newsletters"
                        tooltip="Newsletters waiting for administrator approval."
                        value={stats?.pendingNewsletters} />
                    <StatCard to="/admin/inquiries" icon="/image/inquiries-icon.png" label="Pending Inquiries"
                        tooltip="Client inquiries that have not yet received a response."
                        value={stats?.pendingInquiries} />
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
