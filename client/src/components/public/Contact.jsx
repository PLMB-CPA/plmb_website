import { useState } from 'react';
import './Contact.css';

// Ported from src/views/inquiry-page.html + src/public/js/inquiry.js

const emptyForm = {
    firstName: '',
    lastName: '',
    businessName: '',
    category: '',
    industrySector: '',
    subject: '',
    message: '',
    email: '',
};

function Contact() {
    const [form, setForm] = useState(emptyForm);
    const [status, setStatus] = useState('');
    const [ticket, setTicket] = useState(null); // non-null = show success modal

    // One handler for every field: uses the input's name="" to pick which key to update
    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus('');

        try {
            const res = await fetch('/api/inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (res.ok) {
                setTicket(data.inquiry.ticketNumber);
                setForm(emptyForm);
            } else {
                setStatus(data.error || 'Something went wrong.');
            }
        } catch {
            setStatus('Could not reach the server. Please try again later.');
        }
    }

    return (
        <div className="contact-page">
            <div className="inquiry-nav">
                <h3>Send Inquiry</h3>
            </div>

            <div className="inquiry-container">
                <form className="inquiry-form" onSubmit={handleSubmit}>
                    <div className="inquiry-name-row">
                        <input type="text" className="inquiry-field" name="firstName" placeholder="First Name"
                            value={form.firstName} onChange={handleChange} required />
                        <input type="text" className="inquiry-field" name="lastName" placeholder="Last Name"
                            value={form.lastName} onChange={handleChange} required />
                    </div>

                    <input type="text" className="inquiry-field" name="businessName" placeholder="Business Name"
                        value={form.businessName} onChange={handleChange} required />

                    <select className="inquiry-field" name="category" value={form.category} onChange={handleChange} required>
                        <option value="" disabled>Select Inquiry Category</option>
                        <option value="New Client General Inquiry">New Client General Inquiry</option>
                        <option value="Audit & Assurance">Audit & Assurance</option>
                        <option value="Tax Services">Tax Services</option>
                        <option value="Accounting & Bookkeeping">Accounting & Bookkeeping</option>
                        <option value="Business Advisory">Business Advisory</option>
                        <option value="Payroll Services">Payroll Services</option>
                        <option value="Billing Concerns">Billing Concerns</option>
                        <option value="Comments & Complaints">Comments & Complaints</option>
                        <option value="Other">Other</option>
                    </select>

                    <select className="inquiry-field" name="industrySector" value={form.industrySector} onChange={handleChange} required>
                        <option value="" disabled>Select Industry Sector</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Retail">Retail</option>
                        <option value="Professional Services">Professional Services</option>
                        <option value="Non-Profit">Non-Profit</option>
                        <option value="Other">Other</option>
                    </select>

                    <input type="text" className="inquiry-field subject-field" name="subject" placeholder="Subject"
                        value={form.subject} onChange={handleChange} required />
                    <textarea className="inquiry-field message-field" name="message" placeholder="Send us a message..."
                        value={form.message} onChange={handleChange} required />

                    <div className="inquiry-contact">
                        <label htmlFor="inquiry-email">Email:</label>
                        <input type="email" id="inquiry-email" name="email" placeholder="name@email.com"
                            value={form.email} onChange={handleChange} required />
                    </div>

                    {status && <div className="form-status">{status}</div>}

                    <input type="submit" className="inquiry-submit" value="Send Inquiry" />
                </form>
            </div>

            {ticket && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Inquiry sent!</h3>
                        <p>Your ticket number is <strong>{ticket}</strong>.</p>
                        <p>Please take note of this. We will send a response to your given email in at most 2 Business Days.</p>
                        <button onClick={() => setTicket(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Contact;
