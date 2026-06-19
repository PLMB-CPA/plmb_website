document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("username").value;

    console.log(email);
    // Just checking so the email is right
});