import { Link } from 'react-router-dom';
import './About.css';

function About() {
    return (
        <div className="about">
            <div className="about-intro">
                <h2>About the Firm</h2>
                <p>
                    Po Lao Marquez Benedictos & Co. is a Philippine accounting firm established in 1984 in Quezon City.
                    We provide audit, tax, and advisory services to a wide range of clients — from publicly listed corporations
                    to small and medium enterprises navigating their first statutory audit.
                </p> 
            </div>

                <div className="mv-grid">
                    <div className="mv-card">
                        <h3>Our Mission</h3>
                        <p> 
                        We aim to safeguard corporate health by delivering premium independent audit, tax, accounting, 
                        and management consultancy services. We add distinct value by critically evaluating and optimizing risk 
                        management, internal compliance, and governance frameworks.
                        </p>
                    </div>
                </div>

                <p className="section-title">Meet the Partners</p>
                <div className="partners-grid">

                <div className="partner-card">
                    <div className="name">Jennifer Rose K. Po</div>
                    <div className="title">Managing Partner · CPA</div>
                    <p>
                    <br /><b>Head</b><br />
                    Markets, Communication, and Business Development
                    </p>
                </div>

                <div className="partner-card">
                    <div className="name">Geraldine G. Benedictos</div>
                    <div className="title">Senior Partner · CPA</div>
                    <p>
                    <br /><b>Practice Leader</b><br />
                    Audit and Assurance
                    <br />
                    <br /><b>Leader</b><br />
                    Technical Standards and Quality Control
                    </p>
                </div>

                <div className="partner-card">
                    <div className="name">Mina Marie D. Villaroya</div>
                    <div className="title">Partner · CPA</div>
                    <p>
                    <br /><b>Practice Leader</b><br />
                    Tax Advisory and Compliance
                    <br />
                    <br /><b>Deputy Leader</b><br />
                    Audit and Assurance
                    <br />
                    <br /><b>Leader</b><br />
                    Training and Talent Development 
                    </p>
                </div>

                </div>

                <div className="accred">
                <h2>Accreditations & Memberships</h2>
                <div className="accred-list">
                    <span className="accred-pill">
                    <b>Accreditations</b>
                    <ul>
                        <li>Board of Accountancy (BOA)</li>
                        <li>Bureau of Internal Revenue (BIR)</li>
                        <li>Securities and Exchange Commission (SEC)</li>
                    </ul>
                    </span>
                </div>
                <div className="accred-list">
                    <span className="accred-pill">
                    <b>Memberships</b>
                    <ul>
                        <li>Philippine Institute of Certified Public Accountants (PICPA) </li>
                        <li>Association of Certified Public Accountants (ACPAPP)</li>
                        <li>Asian Institute of Taxation (AIT)</li>
                    </ul>
                    </span>
                </div>
                </div>

                <div className="contact">
                <h2>Work with us</h2>
                <p>Get in touch for a consultation on your audit, tax, or advisory needs.</p>
                <Link to="/contact">Contact Us</Link>
                </div>
            </div>
        );
    }

export default About;
