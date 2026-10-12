import './Home.css';

function Home() {
    return (
        <div className="home">
            <h2>Home</h2>

            <div className="highlights">
                <div className="container">
                    <h3>Decades of Experience</h3>
                    <p>Serving clients since 1984, Po Lao Marquez Benedictos & Co. has built over four decades
                    of trust in Philippine accounting.
                    </p>
                </div>
                <div className="container">
                    <h3>Full-Service Expertise</h3>
                    <p>Our team handles the full spectrum of accounting needs: audit, tax, and advisory services,
                    all backed by licensed CPAs who understand your business.
                    </p>
                </div>
                <div className="container">
                    <h3>Every Business at Every Stage</h3>
                    <p>We work with clients across every stage of growth. From small and medium enterprises undergoing
                    their first statutory audit to publicly listed corporations with complex reporting needs.
                    </p>
                </div>
            </div>

            <div className="map">
                <div className="container">
                    <h3>Where to Find Us</h3>
                    <h4>Business Address</h4>
                    <p>18A Villa Soccoro St., Brgy. Bahay Toro, Quezon City, Philippines</p>
                    <p>Mondays to Fridays, 9:00 AM to 5:00 PM</p>
                    <div className="map-wrapper">
                        <iframe
                            title="PLMB office location"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3859.86355125473!2d121.01689137510729!3d14.663683885830219!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b6e8e391e6f1%3A0x99eec18209208637!2s18a%20Villa%20Socorro%20St%2C%20Project%208%2C%20Quezon%20City%2C%20Metro%20Manila!5e0!3m2!1sen!2sph!4v1784770933197!5m2!1sen!2sph"
                            width="600"
                            height="450"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                        ></iframe>
                    </div>
                    <h4>Facebook Page</h4>
                    <a href="https://www.facebook.com/p/Po-Lao-Marquez-Benedictos-Company-100064220793306/">Po Lao Marquez Benedictos</a>
                </div>
            </div>
        </div>
    );
}

export default Home;
