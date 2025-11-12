const loggoutButton = document.getElementById('loggout-button');
const loginButton = document.getElementById('login-button');
var looggedIn = Boolean(localStorage.getItem('loggedIn'));
var username = localStorage.getItem('username');

function init() {
    

    if (looggedIn) {
        loggoutButton.style.display = 'block';
        loginButton.textContent = username;
    }
}
window.onload = init;

loggoutButton.addEventListener('click',  () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    window.location.href = '../index.html';
});

loginButton.addEventListener('click',  () => {
    if (!looggedIn) {
        window.location.href = 'home.html';
    }
});
    