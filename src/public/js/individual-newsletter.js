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
        else
            image.style.display = "none";
        
        document.getElementById("text").innerHTML = newsletter.content;
        
    } catch (error) {
        console.error("Error loading newsletter:", error);
    }
});