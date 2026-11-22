import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import './AdminCreation.css';

const EMPTY_FORM = {
    firstName: '', lastName: '', email: '', phoneNumber: '',
    businessName: '', address: '', city: '',
};

function ClientCreation() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/admin/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
                return;
            }
            setSuccess(`Account created. A temporary password was sent to ${form.email}.`);
            setForm(EMPTY_FORM);
        } catch {
            setError('Network error. Try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="admin-form-page">
            <AdminHeader />

            <div className="form-wrap">
                <div className="form-title">
                    <nav className="breadcrumb" aria-label="Breadcrumb">
                        <Link to="/admin/clients">Manage Clients</Link>
                        <span className="sep" aria-hidden="true">/</span>
                        <span>Add Client</span>
                    </nav>
                    <h1>Add Client</h1>
                    <p>
                        Creates a client portal account. A welcome email with a temporary password goes to
                        the client, who must set their own password on first login.
                    </p>
                </div>

                <form className="form-card" onSubmit={handleSubmit}>
                    <section className="form-section">
                        <div>
                            <h2>Contact person</h2>
                            <p className="section-hint">Who logs in to the portal.</p>
                        </div>
                        <div className="form-grid">
                            <label className="field">
                                First name
                                <input name="firstName" placeholder="Juan"
                                    value={form.firstName} onChange={handleChange} required />
                            </label>
                            <label className="field">
                                Last name
                                <input name="lastName" placeholder="Dela Cruz"
                                    value={form.lastName} onChange={handleChange} required />
                            </label>
                            <label className="field">
                                Email
                                <input name="email" type="email" placeholder="juan@business.com"
                                    value={form.email} onChange={handleChange} required />
                                <span className="field-hint">The temporary password is sent here.</span>
                            </label>
                            <label className="field">
                                Phone number
                                <input name="phoneNumber" type="tel" placeholder="0917 123 4567"
                                    value={form.phoneNumber} onChange={handleChange} required />
                            </label>
                        </div>
                    </section>

                    <section className="form-section">
                        <div>
                            <h2>Business</h2>
                            <p className="section-hint">The company the firm handles for this client.</p>
                        </div>
                        <div className="form-grid">
                            <label className="field full">
                                Business name
                                <input name="businessName" placeholder="Dela Cruz Trading Co."
                                    value={form.businessName} onChange={handleChange} required />
                            </label>
                            <label className="field full">
                                Address
                                <input name="address" placeholder="Unit 4B, 123 Rizal Ave."
                                    value={form.address} onChange={handleChange} required />
                            </label>
                            <label className="field">
                                City
                                <input name="city" placeholder="Manila"
                                    value={form.city} onChange={handleChange} required />
                            </label>
                        </div>
                    </section>

                    {error && <p className="form-message error">{error}</p>}
                    {success && <p className="form-message success">{success}</p>}

                    <div className="form-actions">
                        <Link to="/admin/clients" className="btn-secondary">Cancel</Link>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ClientCreation;
