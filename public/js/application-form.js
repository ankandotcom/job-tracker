document.addEventListener('DOMContentLoaded', async function() {
  requireAuth();
  renderNav('Applications');
  var editId = new URLSearchParams(window.location.search).get('id');
  if (editId) {
    document.getElementById('page-title').textContent = 'Edit application';
    document.getElementById('submit-btn').textContent = 'Save changes';
    try {
      var app = await apiFetch('/applications/' + editId);
      document.getElementById('f-company').value = app.company;
      document.getElementById('f-role').value    = app.role;
      document.getElementById('f-salary').value  = app.salary_range || '';
      document.getElementById('f-url').value     = app.url || '';
      document.getElementById('f-notes').value   = app.notes || '';
      document.getElementById('f-status').value  = app.status;
    } catch(e) { console.error(e); }
  }

  document.getElementById('toggle-jd-btn').addEventListener('click', function() {
    var panel = document.getElementById('jd-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('jd-btn').addEventListener('click', async function() {
    var text = document.getElementById('jd-text').value.trim();
    var btn  = document.getElementById('jd-btn');
    var st   = document.getElementById('jd-status');
    if (!text) { st.textContent = 'Paste a job description first.'; return; }
    btn.disabled = true; btn.textContent = 'Extracting…';
    try {
      var f = await apiFetch('/ai/parse-jd', { method:'POST', body: JSON.stringify({ jdText: text }) });
      if (f.company)      document.getElementById('f-company').value = f.company;
      if (f.role)         document.getElementById('f-role').value    = f.role;
      if (f.salary_range) document.getElementById('f-salary').value  = f.salary_range;
      var extras = [
        f.skills          ? 'Key skills: ' + f.skills          : '',
        f.employment_type ? 'Type: '        + f.employment_type : '',
        f.location        ? 'Location: '    + f.location        : ''
      ].filter(Boolean).join('\n');
      if (extras) {
        var n = document.getElementById('f-notes');
        n.value = n.value ? n.value + '\n\n' + extras : extras;
      }
      st.style.color = 'var(--teal)'; st.textContent = 'Fields filled — review and save.';
      document.getElementById('jd-panel').style.display = 'none';
    } catch(ex) { st.style.color = 'var(--red)'; st.textContent = ex.message; }
    btn.disabled = false; btn.textContent = 'Extract fields';
  });

  document.getElementById('app-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('submit-btn');
    var err = document.getElementById('form-error');
    btn.disabled = true; err.style.display = 'none';
    var body = {
      company:      document.getElementById('f-company').value,
      role:         document.getElementById('f-role').value,
      status:       document.getElementById('f-status').value,
      salary_range: document.getElementById('f-salary').value || undefined,
      url:          document.getElementById('f-url').value    || undefined,
      notes:        document.getElementById('f-notes').value  || undefined
    };
    try {
      if (editId) {
        await apiFetch('/applications/' + editId, { method:'PUT',  body: JSON.stringify(body) });
      } else {
        await apiFetch('/applications',            { method:'POST', body: JSON.stringify(body) });
      }
      window.location.href = '/applications.html';
    } catch(ex) {
      err.textContent = ex.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = editId ? 'Save changes' : 'Save application';
    }
  });
});