const pwInput = document.getElementById('password');
const pwButton = document.getElementById('pw-button');
const pwButtonConfirm = document.getElementById('pw-button-confirm');


pwButton.addEventListener('click', () => {
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    pwButton.style.backgroundImage = "url('/image/eye-open.svg')";
  } else {
    pwInput.type = 'password';
    pwButton.style.backgroundImage = "url('/image/eye-closed.svg')";
  }
});

// this is for the admin creation page, as it has a confirm pw field
if (pwButtonConfirm) {
  const pwConfirmInput = document.getElementById('confirm-password');
  pwButtonConfirm.addEventListener('click', () => {
    if (pwConfirmInput.type === 'password') {
      pwConfirmInput.type = 'text';
      pwButtonConfirm.style.backgroundImage = "url('/image/eye-open.svg')";
    } else {
      pwConfirmInput.type = 'password';
      pwButtonConfirm.style.backgroundImage = "url('/image/eye-closed.svg')";
    }
  });
}
