document.addEventListener("DOMContentLoaded", async () => {
    try {
        const id = new URLSearchParams(window.location.search).get("id");

        const response = await fetch(`/api/newsletter/${id}`);
        const data = await response.json();
        const newsletter = data.newsletter;
        
        document.getElementById("title").textContent = newsletter.title;
        document.getElementById("author").textContent = newsletter.author;
        document.getElementById("date").textContent = new Date(newsletter.date).toLocaleDateString();
        document.getElementById("text").innerHTML = newsletter.content;
    } catch (error) {
        console.error("Error loading newsletter:", error);
    }
});