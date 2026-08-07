const form = document.getElementById('login-form');
const params = new URLSearchParams(location.search);
const error = params.get('error');
const errorMsg = document.getElementById('login-error');

if (error === 'invalid') alert('Invalid username or password');
else if (error ==='server') alert('Something went wrong, please try again.');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username, password})
    });

    const data = await res.json();

    if (data.error){
        errorMsg.textContent = data.error;
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
            errorMsg.textContent = '';
        }, 4000);
    }
    if (data.redirect)
        window.location.href = data.redirect;
    
    sessionStorage.setItem('token', data.token);


});