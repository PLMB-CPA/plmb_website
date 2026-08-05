document.addEventListener("DOMContentLoaded", () => {
    fetch('/api/newsletters')
        .then(response => response.json())
        .then(newsletters => {
            const container = document.getElementById("newsletterContainer");

            newsletters.forEach(newsletter => {
                container.innerHTML += `
                    <a href="newsletter.html?id=${newsletter.id}">
                        <div class="newsletter-card">
                            <h2>${newsletter.title}</h2>
                            <p class="newsletter-date">${newsletter.date}</p>
                            <p class="newsletter-desc">${newsletter.description}</p>
                        </div>
                    </a>
                `;
            });
        })
        .catch(error => {
            console.error("Error loading newsletters:", error);
        });
});