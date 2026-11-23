import { useOutletContext } from 'react-router-dom';

function AdminHeader({ title = 'Admin Panel' }) {
    const { admin } = useOutletContext();

    return (
        <div className="welcome-message">
            <div className="welcome-left">
                <h1>{title}</h1>
            </div>

            <div className="divider"></div>

            <div className="welcome-right">
                <div className="admin-info">
                    <h3>{admin.name || admin.username}</h3>
                    <p>{admin.isMain ? 'Main Administrator' : 'Administrator'}</p>
                </div>
            </div>
        </div>
    );
}

export default AdminHeader;
