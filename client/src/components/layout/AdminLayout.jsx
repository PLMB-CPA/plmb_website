import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import useAdminSession from "../admin/useAdminSession";
import "./AdminLayout.css";

function AdminLayout() {
    // null while checking the login; logged-out visitors get sent to /admin/login
    const username = useAdminSession();

    // Phone screens only: whether the collapsed menu is open
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => setMenuOpen(false);

    // Don't flash the admin UI while the check is running
    if (username === null) return null;

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
                            <NavLink to="/admin" end className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/menu.png" alt="" />
                                <span>Dashboard</span>
                            </NavLink>
                            <NavLink to="/admin/newsletters" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/newsletter-icon.png" alt="" />
                                <span>Newsletters</span>
                            </NavLink>
                            <NavLink to="/admin/inquiries" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/inquiries-icon.png" alt="" />
                                <span>Inquiries</span>
                            </NavLink>
                            <NavLink to="/admin/clients" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/user-icon.png" alt="" />
                                <span>Manage Clients</span>
                            </NavLink>
                            <NavLink to="/admin/manage" className="dash-side" onClick={closeMenu}>
                                <img className="menu-icon" src="/image/user.png" alt="" />
                                <span>Manage Admin</span>
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
                        {/* context hands username to every admin page (read it with useOutletContext) */}
                        <Outlet context={{ username }} />
                    </main>
                </div>
            </div>
        </div>
    );
}

export default AdminLayout;
