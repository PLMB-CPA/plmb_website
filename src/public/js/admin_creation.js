let params = new URLSearchParams(window.location.search);
let manageType = params.get('mode') || 'add';
let adminId = params.get('id') || '';
let header = document.getElementById('form-header');
let submitBUtton = document.getElementById('submit_btn');
let username = document.querySelector('.username');
let usernameInput = document.getElementById('username');
let adminForm = document.getElementById('admin-form');
let inputError = document.getElementById('input-error');

if (manageType==='change') {
  header.textContent = 'Change Password';
  submitBUtton.textContent = 'Update Password';
  username.style.display = 'none';
  usernameInput.removeAttribute('required');
} 
else {
  header.textContent = 'Add Admin';
  submitBUtton.textContent = 'Confirm';
}

adminForm.addEventListener('submit', function(e) {
  e.preventDefault();
  inputError.textContent = '';

  let pass = document.getElementById('password').value;
  let confirmPass = document.getElementById('confirm-password').value;

  if (pass !== confirmPass) {
    inputError.textContent = 'Passwords do not match';
    return;
  }

  let url, method, body;

  if (manageType==='add') {
    url = '/api/admin/users';
    method = 'POST';
    body = {username: usernameInput.value, password: pass};
  } 
  else {
    url = '/api/admin/users/' + adminId + '/password';
    method = 'PUT';
    body = {password: pass};
  }

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error)
        inputError.textContent = data.error;
      else
        window.location.href = 'admin_management.html';
    })
    .catch(function() {
      inputError.textContent = 'Network error. Try again.';
    });
});