const senhaInput = document.getElementById('senha');
const toggleSenha = document.getElementById('toggleSenha');
const iconeSenha = document.getElementById('iconeSenha');
    
toggleSenha.addEventListener('click', () => {
    const tipo = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
    senhaInput.setAttribute('type', tipo);
    iconeSenha.classList.toggle('bi-eye');
    iconeSenha.classList.toggle('bi-eye-slash');
});
  