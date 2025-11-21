const apiUrl = 'http://localhost/api/login';

const loginButton = document.getElementById('submit');
const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('login');
const passwordInput = document.getElementById('passwd');
const incorrectLogin = document.getElementById('incorrect-login');
looggedIn = Boolean(localStorage.getItem('loggedIn'));
var looggedIn = false;


function init() {
  
  if (looggedIn) {
    window.location.href = 'group.html';
  }
  
}
window.onload = init;

loginButton.addEventListener('click',  async (e) => {
  if (looggedIn) {
    window.location.href = 'group.html';
  }
  else {
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    const res = await fetch('apiUrl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
      
    });
    const data = await res.json();

    if(res.ok){
    incorrectLogin.style.display = 'none';
    console.log(data);
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('clientToken', username);
    //localStorage.setItem('clientToken', data.clientToken);
    localStorage.setItem('username', username);
    window.location.href = 'group.html';
    }
    else {
      incorrectLogin.style.display = 'block';
      console.log('Login failed:', data.message);
    }
}
});

