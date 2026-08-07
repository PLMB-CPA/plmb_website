document.addEventListener("DOMContentLoaded", async () => {
    // Newsletter bodies are stored as HTML from the editor. Cards show a short
    // teaser, so pull the words out first: slicing the markup would cut a tag in
    // half and show "<stro" to the reader.
    //
    // DOMParser is used rather than a scratch div because it neither runs scripts
    // nor fetches anything while parsing.
    const toPlainText = (html) => {
        if (!html) return "";
        // Closing block tags imply a space. Without this, textContent runs the
        // last word of a heading straight into the paragraph after it
        // ("Tax UpdateThe BIR has...").
        const spaced = html.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>|<br\s*\/?>/gi, " ");
        const parsed = new DOMParser().parseFromString(spaced, "text/html");
        return (parsed.body.textContent || "").replace(/\s+/g, " ").trim();
    };

    const escapeHtml = (value) => {
        const div = document.createElement("div");
        div.textContent = value == null ? "" : value;
        return div.innerHTML;
    };

    try {
        const response = await fetch("/api/announcements");
        const data = await response.json();

        const container = document.getElementById("newsletterContainer");

        data.newsletters.forEach(newsletter => {
            const text = toPlainText(newsletter.content);
            const preview = text.length > 100 ? text.substring(0, 100) + "..." : text;

            container.innerHTML += `
                <a href="newsletter.html?id=${encodeURIComponent(newsletter._id)}">
                    <div class="newsletter-card">
                        <h2>${escapeHtml(newsletter.title)}</h2>
                        <p class="newsletter-date">
                            ${new Date(newsletter.date).toLocaleDateString()}
                        </p>
                        <p class="newsletter-desc">${escapeHtml(preview)}</p>
                    </div>
                </a>
            `;
        });
    } catch (error) {
        console.error("Error loading newsletters:", error);
    }
});
