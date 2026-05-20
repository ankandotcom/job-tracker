document.addEventListener('DOMContentLoaded', function() {
  requireAuth();
  renderNav('Applications');
  document.getElementById('filter-status').addEventListener('change', loadApps);
  document.getElementById('filter-sort').addEventListener('change', loadApps);
  document.getElementById('filter-order').addEventListener('change', loadApps);
  loadApps();
});

async function loadApps() {
  var status = document.getElementById('filter-status').value;
  var sort   = document.getElementById('filter-sort').value;
  var order  = document.getElementById('filter-order').value;
  var qs     = '?sort=' + sort + '&order=' + order + (status ? '&status=' + status : '');
  
  try {
    var apps = await apiFetch('/applications' + qs);
    document.getElementById('count-label').textContent = apps.length + ' application' + (apps.length !== 1 ? 's' : '');
    
    var tbody = document.getElementById('apps-body');
    tbody.innerHTML = ''; // Clear previous content safely
    
    if (!apps.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--muted)">No applications yet — <a href="/application-form.html" style="color:var(--purple)">add one</a>.</td></tr>';
      return;
    }

    // Loop and build rows using the secure DOM elements approach to bypass character escaping crashes
    apps.forEach(function(a) {
      var tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      
      // Safe, native redirection handler
      tr.addEventListener('click', function() {
        window.location.href = '/application-detail.html?id=' + a.id;
      });

      // Escape single quotes in company name for the delete alert modal
      var escapedCompanyName = (a.company || '').replace(/'/g, "\\'");

      tr.innerHTML = 
        '<td><strong>' + a.company + '</strong></td>' +
        '<td>' + a.role + '</td>' +
        '<td><span class="badge ' + STATUS_COLORS[a.status] + '">' + STATUS_LABELS[a.status] + '</span></td>' +
        '<td>' + (a.ai_score ? '<span class="score-badge ' + scoreBadgeClass(a.ai_score) + '">' + a.ai_score + '</span>' : '<span class="text-muted text-sm">—</span>') + '</td>' +
        '<td class="text-muted text-sm">' + (a.salary_range || '—') + '</td>' +
        '<td class="text-muted text-sm">' + fmtDate(a.applied_at) + '</td>' +
        '<td><a href="/application-form.html?id=' + a.id + '" class="btn btn-ghost btn-sm edit-link">Edit</a></td>' +
        '<td><button class="btn btn-sm delete-btn" style="background:#ef4444; color:#fff; border:none; padding: 0.25rem 0.5rem; border-radius: 4px;">Delete</button></td>';

      // CRITICAL: Prevent the row redirection click from firing when clicking Edit or Delete
      tr.querySelector('.edit-link').addEventListener('click', function(e) {
        e.stopPropagation();
      });

      tr.querySelector('.delete-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        deleteApp(a.id, escapedCompanyName);
      });

      tbody.appendChild(tr);
    });

  } catch(e) { 
    console.error("Failed to render rows smoothly:", e); 
  }
}

// Global action delete coordinator
async function deleteApp(id, companyName) {
  if (confirm('Are you sure you want to permanently delete your application for ' + companyName + '?')) {
    try {
      await apiFetch('/applications/' + id, { method: 'DELETE' });
      await loadApps(); // Re-render table elements live
    } catch (err) {
      alert('Failed to remove tracking application: ' + err.message);
      console.error(err);
    }
  }
}