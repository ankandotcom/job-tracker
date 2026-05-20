function showTab(tab) {
  var isLogin = tab === 'login';
  document.getElementById('form-login').style.display    = isLogin ? 'flex' : 'none';
  document.getElementById('form-register').style.display = isLogin ? 'none' : 'flex';
  document.getElementById('tab-login').className = 'btn ' + (isLogin ? 'btn-primary' : 'btn-ghost');
  document.getElementById('tab-reg').className   = 'btn ' + (isLogin ? 'btn-ghost'   : 'btn-primary');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('tab-login').addEventListener('click', function() { showTab('login');    });
  document.getElementById('tab-reg').addEventListener('click',   function() { showTab('register'); });

  document.getElementById('form-login').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('login-btn');
    var err = document.getElementById('login-error');
    btn.disabled = true; btn.textContent = 'Signing in…';
    err.style.display = 'none';
    try {
      var data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email:    document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        })
      });
      setToken(data.accessToken);
      window.location.href = '/dashboard.html';
    } catch(ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  });

  document.getElementById('form-register').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('reg-btn');
    var err = document.getElementById('reg-error');
    btn.disabled = true; btn.textContent = 'Creating account…';
    err.style.display = 'none';
    var email    = document.getElementById('reg-email').value;
    var password = document.getElementById('reg-password').value;
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name:     document.getElementById('reg-name').value,
          email:    email,
          password: password
        })
      });
      var data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email, password: password })
      });
      setToken(data.accessToken);
      window.location.href = '/dashboard.html';
    } catch(ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Create account';
    }
  });
});