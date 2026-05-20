var _appId = new URLSearchParams(window.location.search).get('id');
var _app;

document.addEventListener('DOMContentLoaded', async function () {
  requireAuth();
  renderNav('Applications');
  if (!_appId) { window.location.href = '/applications.html'; return; }

  try {
    _app = await apiFetch('/applications/' + _appId);

    // Core Layout Bindings
    safeSetText('detail-title', _app.role);
    safeSetText('detail-sub', _app.company);
    safeSetText('detail-date', fmtDate(_app.applied_at));
    safeSetText('detail-salary', _app.salary_range || '—');
    safeSetText('detail-notes', _app.notes || 'None');

    var statusEl = document.getElementById('detail-status');
    if (statusEl) {
      statusEl.innerHTML = '<span class="badge ' + STATUS_COLORS[_app.status] + '">' + STATUS_LABELS[_app.status] + '</span>';
    }

    var urlEl = document.getElementById('detail-url');
    if (urlEl) {
      urlEl.innerHTML = _app.url ? '<a href="' + _app.url + '" target="_blank" style="color:var(--purple)">' + _app.url + '</a>' : '—';
    }

    var editBtn = document.getElementById('edit-btn');
    if (editBtn) {
      editBtn.href = '/application-form.html?id=' + _appId;
    }

    var hist = _app.history || [];
    var historyList = document.getElementById('history-list');
    if (historyList) {
      historyList.innerHTML = hist.length ? hist.map(function (h) {
        return '<div style="display:flex;gap:.5rem;align-items:center;padding:.4rem 0;border-bottom:1px solid var(--border)">'
          + (h.from_status ? '<span class="badge ' + STATUS_COLORS[h.from_status] + '">' + STATUS_LABELS[h.from_status] + '</span> → ' : '')
          + '<span class="badge ' + STATUS_COLORS[h.to_status] + '">' + STATUS_LABELS[h.to_status] + '</span>'
          + '<span class="text-muted text-sm" style="margin-left:auto">' + fmtDate(h.changed_at) + '</span></div>';
      }).join('') : 'No history yet.';
    }

    if (_app.ai_score) {
      renderScore({
        score: _app.ai_score,
        verdict: _app.ai_score_reason,
        summary: 'Last scored ' + fmtDate(_app.ai_scored_at)
      });
    }
  } catch (e) {
    console.error("Failed structural card initialization process:", e);
  }

  // Secure operational element click hook bindings
  var gapBtn = document.getElementById('gap-btn');
  if (gapBtn) gapBtn.addEventListener('click', runGap);

  var deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', deleteApp);
});

function safeSetText(id, fallbackVal) {
  var element = document.getElementById(id);
  if (element) element.textContent = fallbackVal;
}

function renderScore(d) {
  var badge = document.getElementById('gap-score-badge');
  if (badge) {
    badge.textContent = d.score;
    badge.className = 'score-badge ' + scoreBadgeClass(d.score);
  }
  safeSetText('gap-verdict', d.verdict || '');
  safeSetText('gap-summary', d.summary || '');

  var strengthsEl = document.getElementById('gap-strengths');
  if (strengthsEl && d.strengths) {
    strengthsEl.innerHTML = d.strengths.map(function (s) { return '<span class="pill-green">' + s + '</span>'; }).join('');
  }

  var gapsEl = document.getElementById('gap-gaps');
  if (gapsEl && d.gaps) {
    gapsEl.innerHTML = d.gaps.map(function (g) { return '<span class="pill-red">' + g + '</span>'; }).join('');
  }

  var rewritesEl = document.getElementById('gap-rewrites');
  if (rewritesEl && d.rewrites) {
    rewritesEl.innerHTML = d.rewrites.map(function (r) {
      return '<div class="rewrite-box"><div class="text-muted" style="margin-bottom:.3rem">Before: <em>' + r.original + '</em></div><div>After: <strong>' + r.improved + '</strong></div></div>';
    }).join('');
  }

  var resultPane = document.getElementById('gap-result');
  if (resultPane) resultPane.style.display = 'flex';
}

async function runGap() {
  var btn = document.getElementById('gap-btn');
  if (!btn) return;
  btn.disabled = true; btn.textContent = 'Analysing…';

  var noResumeWarning = document.getElementById('gap-no-resume');
  if (noResumeWarning) noResumeWarning.style.display = 'none';

  try {
    var data = await apiFetch('/ai/gap-analysis/' + _appId, { method: 'POST' });
    renderScore(data);
    btn.textContent = 'Re-analyse';
  } catch (ex) {
    console.error(ex);
    // FIX: Check if the error text explicitly mentions the resume
    if (ex.message && ex.message.includes('resume')) {
      if (noResumeWarning) noResumeWarning.style.display = 'block';
    } else {
      // Show the actual error message (like "Gemini is experiencing high demand")
      alert(ex.message || "An unexpected error occurred.");
    }
    btn.textContent = 'Analyse fit';
  }
  btn.disabled = false;
}

async function deleteApp() {
  if (!confirm('Delete ' + (_app ? _app.company + ' — ' + _app.role : 'this application') + '?')) return;
  try {
    await apiFetch('/applications/' + _appId, { method: 'DELETE' });
    window.location.href = '/applications.html';
  } catch (e) { alert(e.message); }
}