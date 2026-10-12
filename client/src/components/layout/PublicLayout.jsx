import { Outlet, NavLink, Link } from 'react-router-dom';
import './PublicLayout.css';

function PublicLayout() {
    return (
        <div className="public-layout">
            <div className="header">
                <img id="logo" src="/image/logo.png" alt="Logo" />
                <h1>Po Lao Marquez Benedictos & Co.</h1>
                <p>Certified Public Accountants</p>
            </div>

            <nav>
                <NavLink to="/" end>Home</NavLink>
                <NavLink to="/services">Services</NavLink>
                <NavLink to="/about">About Us</NavLink>
                <NavLink to="/newsletter">Newsletter</NavLink>
                <NavLink to="/contact">Contact Us</NavLink>
            </nav>

            <main className="public-main">
                <Outlet /> {/* This is where the child routes will be rendered */}
            </main>

            <footer className="footer">
                <p>
                    <Link to="/admin/login">© Po Lao Marquez Benedictos & Co.</Link> | All Rights Reserved
                </p>
            </footer>
        </div>
    );
}

export default PublicLayout;
