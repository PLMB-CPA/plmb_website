import { useOutletContext } from 'react-router-dom';

// The white bar across the top of every admin page: page title on the left,
// avatar + logged-in username on the right. Styles live in AdminLayout.css.
// (Replaces the copy of this markup in every admin_*.html + admin_headname.js)
function AdminHeader({ title = 'Admin Dashboard' }) {
    const { username } = useOutletContext();

    return (
        <div className="welcome-message">
            <div className="welcome-left">
                <h1>{title}</h1>
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
    );
}

export default AdminHeader;
