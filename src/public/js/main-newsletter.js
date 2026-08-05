document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/api/announcements");
        const data = await response.json();

        console.log(data);

        const container = document.getElementById("newsletterContainer");

        data.newsletters.forEach(newsletter => {
            const preview =
                newsletter.content.length > 100
                    ? newsletter.content.substring(0, 100) + "..."
                    : newsletter.content;

            container.innerHTML += `
                <a href="newsletter.html?id=${newsletter._id}">
                    <div class="newsletter-card">
                        <h2>${newsletter.title}</h2>
                        <p class="newsletter-date">
                            ${new Date(newsletter.date).toLocaleDateString()}
                        </p>
                        <p class="newsletter-desc">${preview}</p>
                    </div>
                </a>
            `;
        });
    } catch (error) {
        console.error("Error loading newsletters:", error);
    }
});