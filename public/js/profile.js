document.addEventListener('DOMContentLoaded', async function() {
  requireAuth();
  renderNav('Profile');
  document.getElementById('p-resume').addEventListener('input', function() {
    document.getElementById('resume-char').textContent = this.value.length.toLocaleString() + ' characters';
  });
  try {
    var profile = await apiFetch('/user/me');
    document.getElementById('p-name').value   = profile.name;
    document.getElementById('p-email').value  = profile.email;
    document.getElementById('p-resume').value = profile.resume_text || '';
    document.getElementById('resume-char').textContent = (profile.resume_text || '').length.toLocaleString() + ' characters';
    setNavUser(profile.name);
  } catch(e) { console.error(e); }

  document.getElementById('form-profile').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('profile-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await apiFetch('/user/profile', { method:'PUT', body: JSON.stringify({ name: document.getElementById('p-name').value }) });
      showMsg('profile-msg', 'Profile saved.', true);
      setNavUser(document.getElementById('p-name').value);
    } catch(ex) { showMsg('profile-msg', ex.message, false); }
    btn.disabled = false; btn.textContent = 'Save changes';
  });

  document.getElementById('form-resume').addEventListener('submit', async function(e) {
    e.preventDefault();
    var text = document.getElementById('p-resume').value.trim();
    if (!text) { showMsg('resume-msg', 'Resume cannot be empty.', false); return; }
    var btn = document.getElementById('resume-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await apiFetch('/user/resume', { method:'PUT', body: JSON.stringify({ resume_text: text }) });
      showMsg('resume-msg', 'Resume saved. Gap analyser is ready to use.', true);
    } catch(ex) { showMsg('resume-msg', ex.message, false); }
    btn.disabled = false; btn.textContent = 'Save resume';
  });
});

function showMsg(id, text, ok) {
  var el = document.getElementById(id);
  el.textContent = text; el.style.color = ok ? 'var(--teal)' : 'var(--red)'; el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 3000);
}