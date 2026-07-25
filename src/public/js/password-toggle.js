const pwInput = document.getElementById('password');
const pwButton = document.getElementById('pw-button');

pwButton.addEventListener('click', () => {
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    pwButton.style.backgroundImage = "url('/image/eye-open.svg')";
  } else {
    pwInput.type = 'password';
    pwButton.style.backgroundImage = "url('/image/eye-closed.svg')";
  }
});
