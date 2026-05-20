document.addEventListener('DOMContentLoaded', async function() {
  requireAuth();
  renderNav('Dashboard');
  try {
    var results = await Promise.all([
      apiFetch('/stats'),
      apiFetch('/applications?sort=applied_at&order=DESC'),
      apiFetch('/user/me')
    ]);
    var stats = results[0], apps = results[1], profile = results[2];
    setNavUser(profile.name);
    document.getElementById('stat-total').textContent     = stats.total;
    document.getElementById('stat-applied').textContent   = stats.by_status.applied   || 0;
    document.getElementById('stat-interview').textContent = stats.by_status.interview  || 0;
    document.getElementById('stat-offer').textContent     = stats.by_status.offer      || 0;
    document.getElementById('stat-rejected').textContent  = stats.by_status.rejected   || 0;
    var recent = apps.slice(0, 8);
    var tbody  = document.getElementById('recent-body');
    tbody.innerHTML = recent.length ? recent.map(function(a) {
      return '<tr onclick="location.href=\'/application-detail.html?id=' + a.id + '\'" style="cursor:pointer">'
        + '<td><strong>' + a.company + '</strong></td>'
        + '<td>' + a.role + '</td>'
        + '<td><span class="badge ' + STATUS_COLORS[a.status] + '">' + STATUS_LABELS[a.status] + '</span></td>'
        + '<td>' + (a.ai_score ? '<span class="score-badge ' + scoreBadgeClass(a.ai_score) + '">' + a.ai_score + '</span>' : '<span class="text-muted">—</span>') + '</td>'
        + '<td class="text-muted">' + fmtDate(a.applied_at) + '</td>'
        + '</tr>';
    }).join('') : '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">No applications yet — <a href="/application-form.html" style="color:var(--purple)">add one</a>.</td></tr>';
  } catch(e) { console.error(e); }
});