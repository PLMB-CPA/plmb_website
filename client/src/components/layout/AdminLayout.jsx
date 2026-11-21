import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { saveLastAdminPage } from "../admin/lastAdminPage";
import useAdminSession from "../admin/useAdminSession";
import "./AdminLayout.css";

function AdminLayout() {
    // null while checking the login; logged-out visitors get sent to /admin/login
    const [admin, setAdmin] = useAdminSession();

    // Phone screens only: whether the collapsed menu is open
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => setMenuOpen(false);

    const location = useLocation();
    const adminId = admin?.id;

    useEffect(() => {
        if (adminId) saveLastAdminPage(adminId, location.pathname + location.search);
    }, [adminId, location.pathname, location.search]);

    // Don't flash the admin UI while the check is running
    if (admin === null) return null;

    return (
        <div className="admin-shell">
            <div className="bg-container">
                <div className="dashboard">
                    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
                        <div className="sidebar-brand">
                            <img id="logo" src="/image/logo.png" alt="Logo" />
                            <h1>PLMB</h1>

                            {/* Only visible on small screens (see AdminLayout.css) */}
                            <button
                                type="button"
                                className="menu-toggle"
                                onClick={() => setMenuOpen(!menuOpen)}
                                aria-label={menuOpen ? "Close menu" : "Open menu"}
                                aria-expanded={menuOpen}
                            >
                                {menuOpen ? "✕" : "☰"}
                            </button>
                        </div>

                        {/* className="dash-side" + NavLink = "dash-side active" on the current page */}
                        <nav className="sidebar-nav">
                            <NavLink to="/admin/clients" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/user-icon.png" alt="" />
                                <span>Manage Clients</span>
                            </NavLink>
                            <NavLink to="/admin/inquiries" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/inquiries-icon.png" alt="" />
                                <span>Inquiries</span>
                            </NavLink>
                            <NavLink to="/admin/newsletters" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/newsletter-icon.png" alt="" />
                                <span>Newsletters</span>
                            </NavLink>
                            <NavLink to="/admin/subscribers" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/subscriber.png" alt="" />
                                <span>Subscribers</span>
                            </NavLink>
<<<<<<< Updated upstream
                            <NavLink to="/admin/clients" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/user-icon.png" alt="" />
                                <span>Manage Clients</span>
                            </NavLink>
                            <NavLink to="/admin/remittances" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/peso-icon.png" alt="" />
                                <span>Remittances</span>
                            </NavLink>
                            <NavLink to="/admin/manage" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/user.png" alt="" />
                                <span>Manage Admin</span>
=======
                            {admin.isMain && (
                                <NavLink to="/admin/manage" className="dash-side" onClick={closeMenu}>
                                    <img className="menu-icon" src="/image/user.png" alt="" />
                                    <span>Manage Admin</span>
                                </NavLink>
                            )}
                            <NavLink to="/admin/settings" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/settings.png" alt="" />
                                <span>Settings</span>
>>>>>>> Stashed changes
                            </NavLink>
                        </nav>

                        {/* Plain <a>, not NavLink: this is a server route that ends the
                            session and then redirects to /admin/login */}
                        <a href="/api/admin/logout" className="dash-side logout">
                            <img className="menu-icon" src="/image/logout.png" alt="" />
                            <span>Logout</span>
                        </a>
                    </aside>

                    <main className="main-content">
                        <Outlet context={{ admin, setAdmin, username: admin.username }} />
                    </main>
                </div>
            </div>
        </div>
    );
}

export default AdminLayout;
