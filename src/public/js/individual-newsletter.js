// Newsletters come in two shapes: older ones written in the plain textarea are
// stored as text with newlines, newer ones from the rich-text editor are HTML.
//
// white-space: pre-line used to render the newlines, but it cannot stay: applied
// to editor HTML it adds a blank line between every <p>. So detect the shape and
// rebuild the breaks manually for the plain-text case.
function renderContent(el, content) {
    const raw = content || "";
    const looksLikeHtml = /<[a-z][^>]*>/i.test(raw);

    if (looksLikeHtml) {
        el.innerHTML = raw;
        return;
    }

    // Blank line starts a new paragraph, single newline is a line break.
    el.textContent = "";
    raw.split(/\n\s*\n/).forEach(block => {
        const p = document.createElement("p");
        block.split("\n").forEach((line, i) => {
            if (i > 0) p.appendChild(document.createElement("br"));
            p.appendChild(document.createTextNode(line));
        });
        el.appendChild(p);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const id = new URLSearchParams(window.location.search).get("id");

        const response = await fetch(`/api/newsletter/${id}`);
        const data = await response.json();
        const newsletter = data.newsletter;
        
        document.getElementById("title").textContent = newsletter.title;
        document.getElementById("author").textContent = `Author: ${newsletter.author}`;
        document.getElementById("date").textContent = "Published: " + new Date(newsletter.date).toLocaleDateString();
        
        const image = document.getElementById("image");

        if (newsletter.image)
            image.src = newsletter.image;
        else{
            image.style.display = "none";
            console.log("NO IMAGE LMAO");
        }
        renderContent(document.getElementById("text"), newsletter.content);

    } catch (error) {
        console.error("Error loading newsletter:", error);
    }
});