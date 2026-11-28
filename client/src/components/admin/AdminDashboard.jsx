import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import './AdminDashboard.css';

function KpiCard({ label, value, accent }) {
    return (
        <div className={`dash-kpi-card${accent ? ' dash-kpi-card--accent' : ''}`}>
            <h3>{label}</h3>
            <p>{value ?? '—'}</p>
        </div>
    );
}

function SectionLabel({ children }) {
    return <p className="dash-section-label">{children}</p>;
}

function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [inquiries, setInquiries] = useState([]);
    const [remittances, setRemittances] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(setStats)
            .catch(() => setError('Could not load stats.'));

        fetch('/api/inquiries')
            .then(res => res.json())
            .then(data => setInquiries(data.inquiries || []))
            .catch(() => {});

        fetch('/api/admin/remittances')
            .then(res => res.json())
            .then(data => setRemittances(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    const now = new Date();
    const overdueInquiries = inquiries.filter(inq =>
        !inq.isAnswered && !inq.isArchived && inq.isOverdue
    );
    const pendingRemittances = remittances.filter(rem =>
        rem.status === 'Pending' && rem.dueDate && new Date(rem.dueDate) < now
    );

    const avgDisplay = stats?.inquiries?.avgResponseMinutes != null
        ? `${stats.inquiries.avgResponseMinutes} min`
        : 'N/A';

    return (
        <div className="dash-page">
            <AdminHeader title="Dashboard" />

            <div className="dash-page-header">
                <div>
                    <h1>Here&apos;s what&apos;s happening today</h1>
                    <p>Overview of your portal activity.</p>
                </div>
            </div>

            {error && <p className="dash-error">{error}</p>}

            <div className="dash-body">

                <SectionLabel>General</SectionLabel>
                <div className="dash-kpi-grid">
                    <KpiCard label="Admins" value={stats?.totalAdmins} />
                    <KpiCard label="Published Newsletters" value={stats?.publishedNewsletters} />
                    <KpiCard label="Draft Newsletters" value={stats?.pendingNewsletters} />
                </div>

                <SectionLabel>Inquiries</SectionLabel>
                <div className="dash-kpi-grid">
                    <KpiCard label="New" value={stats?.inquiries?.byStatus?.new} />
                    <KpiCard label="In Progress" value={stats?.inquiries?.byStatus?.in_progress} />
                    <KpiCard label="Answered" value={stats?.inquiries?.byStatus?.answered} />
                    <KpiCard label="Overdue" value={stats?.inquiries?.overdue} accent={stats?.inquiries?.overdue > 0} />
                    <KpiCard label="Avg Response Time" value={avgDisplay} />
                </div>

                <SectionLabel>Remittances</SectionLabel>
                <div className="dash-kpi-grid">
                    <KpiCard label="Pending" value={stats?.remittances?.byStatus?.Pending} />
                    <KpiCard label="Processing" value={stats?.remittances?.byStatus?.Processing} />
                    <KpiCard label="Remitted" value={stats?.remittances?.byStatus?.Remitted} />
                    <KpiCard label="Completed" value={stats?.remittances?.byStatus?.Completed} />
                    <KpiCard label="Overdue" value={stats?.remittances?.overdue} accent={stats?.remittances?.overdue > 0} />
                </div>

                <SectionLabel>Needs Attention</SectionLabel>
                <div className="dash-attention-grid">

                    <div className="dash-attention-panel">
                        <div className="dash-attention-header">
                            <span>Overdue Inquiries</span>
                            <span className="dash-attention-count">{overdueInquiries.length}</span>
                        </div>
                        {overdueInquiries.length === 0
                            ? <p className="dash-attention-empty">No overdue inquiries.</p>
                            : overdueInquiries.map(inq => (
                                <div key={inq._id} className="dash-attention-row"
                                    onClick={() => navigate(`/admin/inquiries/${inq._id}`)}>
                                    <div className="dash-row-left">
                                        <span className="dash-ticket">{inq.ticketNumber}</span>
                                        <div>
                                            <p className="dash-row-title">{inq.businessName}</p>
                                            <p className="dash-row-sub">{inq.subject}</p>
                                        </div>
                                    </div>
                                    <div className="dash-row-right">
                                        <span className="dash-badge dash-badge--red">Overdue</span>
                                        <p className="dash-row-date">{new Date(inq.date).toISOString().slice(0, 10)}</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <div className="dash-attention-panel">
                        <div className="dash-attention-header">
                            <span>Overdue Remittances</span>
                            <span className="dash-attention-count">{pendingRemittances.length}</span>
                        </div>
                        {pendingRemittances.length === 0
                            ? <p className="dash-attention-empty">No overdue remittances.</p>
                            : pendingRemittances.map(rem => (
                                <div key={rem._id} className="dash-attention-row"
                                    onClick={() => navigate('/admin/remittances')}>
                                    <div className="dash-row-left">
                                        <div>
                                            <p className="dash-row-title">{rem.client?.firstName} {rem.client?.lastName}</p>
                                            <p className="dash-row-sub">{rem.taxType}</p>
                                        </div>
                                    </div>
                                    <div className="dash-row-right">
                                        <span className="dash-badge dash-badge--amber">Pending</span>
                                        <p className="dash-row-date">Due {new Date(rem.dueDate).toISOString().slice(0, 10)}</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
