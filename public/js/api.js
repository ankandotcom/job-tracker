// ── Token helpers ─────────────────────────────────────────────
function getToken()  { return localStorage.getItem('at'); }
function setToken(t) { localStorage.setItem('at', t); }
function clearToken(){ localStorage.removeItem('at'); }

// ── Core fetch wrapper ─────────────────────────────────────────
async function apiFetch(path, options) {
  options = options || {};
  var headers = { 'Content-Type': 'application/json' };
  var token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  var res = await fetch('/api' + path, {
    method: options.method || 'GET',
    headers: headers,
    body: options.body || undefined,
    credentials: 'include'
  });

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    var refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = 'Bearer ' + getToken();
      res = await fetch('/api' + path, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body || undefined,
        credentials: 'include'
      });
    } else {
      clearToken();
      window.location.href = '/index.html';
      return;
    }
  }

  var body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}

async function tryRefresh() {
  try {
    var res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    var data = await res.json();
    setToken(data.accessToken);
    return true;
  } catch(e) { return false; }
}

function requireAuth() {
  if (!getToken()) { window.location.href = '/index.html'; }
}

window.doLogout = function() {
  clearToken();
  fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  }).finally(function() {
    window.location.href = '/index.html';
  });
};

// ── Formatting helpers ─────────────────────────────────────────
var STATUS_LABELS = {
  applied:   'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer:     'Offer',
  rejected:  'Rejected',
  withdrawn: 'Withdrawn'
};

var STATUS_COLORS = {
  applied:   'badge-blue',
  screening: 'badge-amber',
  interview: 'badge-purple',
  offer:     'badge-green',
  rejected:  'badge-red',
  withdrawn: 'badge-gray'
};

function scoreBadgeClass(score) {
  if (!score) return '';
  return score >= 8 ? 'score-green' : score >= 5 ? 'score-amber' : 'score-red';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// ── Nav renderer ───────────────────────────────────────────────
function renderNav(active) {
  var links = [
    { href: '/dashboard.html',    label: 'Dashboard'    },
    { href: '/applications.html', label: 'Applications' },
    { href: '/profile.html',      label: 'Profile'      }
  ];
  var html = '<nav><div class="container nav-inner">'
    + '<a class="nav-logo" href="/dashboard.html">TrackMyJobs</a>'
    + '<div class="nav-links">';
  links.forEach(function(l) {
    html += '<a class="nav-link ' + (l.label === active ? 'active' : '')
          + '" href="' + l.href + '">' + l.label + '</a>';
  });
  html += '</div>'
    + '<span class="nav-user" id="nav-user-name"></span>'
    + '<button id="logout-btn" class="btn-logout">Sign out</button>'
    + '</div></nav>';
  document.body.insertAdjacentHTML('afterbegin', html);

  // Wire logout button directly after inserting
  document.getElementById('logout-btn').addEventListener('click', function() {
    clearToken();
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .finally(function() { window.location.href = '/index.html'; });
  });
}

function setNavUser(name) {
  var el = document.getElementById('nav-user-name');
  if (el) el.textContent = name;
}