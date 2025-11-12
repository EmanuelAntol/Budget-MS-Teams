const loginButton = document.getElementById('submit');
const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('login');
const passwordInput = document.getElementById('passwd');
var looggedIn = false;


function init() {
  username = localStorage.getItem('username');
  looggedIn = Boolean(localStorage.getItem('loggedIn'));
  if (looggedIn) {
    window.location.href = 'player.html';
  }
  
}
window.onload = init;

loginButton.addEventListener('click',  async (e) => {
  if (looggedIn) {
    console.log('Already logged in');
  }
  else {
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    const res = await fetch('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
      
    });
    console.log(res);
    const data = await res.json();

    if(res.ok){
    console.log(data);
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('username', username);
    window.location.href = 'player.html';
    }
    else {
      console.log('Login failed:', data.message);
    }
}
});

