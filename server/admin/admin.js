// Admin panel client side operations
(function() {
  const token = localStorage.getItem('admin_token');
  const adminName = localStorage.getItem('admin_name');

  // 1. Authenticated Route Guard
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Display admin name
  document.getElementById('admin-display-name').textContent = adminName || 'Administrator';

  // 2. Tab Switch Controls
  const tabs = {
    dashboard: document.getElementById('tab-dashboard'),
    users: document.getElementById('tab-users'),
    boards: document.getElementById('tab-boards')
  };

  const tabButtons = {
    dashboard: document.getElementById('tab-dashboard-btn'),
    users: document.getElementById('tab-users-btn'),
    boards: document.getElementById('tab-boards-btn')
  };

  function switchTab(targetTab) {
    Object.keys(tabs).forEach(key => {
      if (key === targetTab) {
        tabs[key].style.display = 'block';
        tabButtons[key].classList.add('active');
      } else {
        tabs[key].style.display = 'none';
        tabButtons[key].classList.remove('active');
      }
    });
  }

  tabButtons.dashboard.addEventListener('click', () => switchTab('dashboard'));
  tabButtons.users.addEventListener('click', () => switchTab('users'));
  tabButtons.boards.addEventListener('click', () => switchTab('boards'));

  // 3. API Network Handling
  const alertBox = document.getElementById('alert-box');

  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async function handleResponse(res) {
    if (res.status === 401 || res.status === 403) {
      // Session expired or forbidden
      localStorage.clear();
      window.location.href = 'login.html';
      return null;
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server request failed');
    }
    return data;
  }

  // Fetch Dashboard Statistics
  async function loadDashboardStats() {
    try {
      const res = await fetch('/api/admin/stats', { headers: getHeaders() });
      const data = await handleResponse(res);
      if (!data) return;

      document.getElementById('stat-users').textContent = data.userCount;
      document.getElementById('stat-boards').textContent = data.boardCount;
      document.getElementById('stat-sockets').textContent = data.activeSocketCount;

      // Update cache toggles
      const badge = document.getElementById('redis-health-badge');
      const toggle = document.getElementById('cache-mode-toggle');
      const warning = document.getElementById('redis-warning-alert');
      const modeLabel = document.getElementById('active-cache-mode-label');
      const toggleText = document.getElementById('toggle-status-text');

      badge.textContent = data.redisConnected ? 'Connected & Healthy' : 'Disconnected / Offline';
      badge.className = `badge ${data.redisConnected ? 'success' : 'danger'}`;
      
      modeLabel.textContent = (data.activeCacheMode || 'redis').toUpperCase();
      toggle.checked = data.activeCacheMode === 'redis';
      toggle.disabled = !data.redisConnected;
      toggleText.textContent = data.activeCacheMode === 'redis' ? 'Using Redis Cache' : 'Using Memory Fallback';

      warning.style.display = data.redisConnected ? 'none' : 'block';
    } catch (err) {
      showError(err.message);
    }
  }

  // Fetch Users List
  async function loadUsersList() {
    try {
      const res = await fetch('/api/admin/users', { headers: getHeaders() });
      const users = await handleResponse(res);
      if (!users) return;

      const tbody = document.getElementById('users-table-body');
      tbody.innerHTML = '';

      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No users registered.</td></tr>`;
        return;
      }

      users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="avatar-dot" style="background-color:${u.avatar_color}"></span>
              <strong>${u.name}</strong>
            </div>
          </td>
          <td>${u.email}</td>
          <td>${new Date(u.createdAt).toLocaleDateString()}</td>
          <td>
            <span class="badge ${(u.role || 'user') === 'admin' ? 'role-admin' : 'role-user'}">${(u.role || 'user').toUpperCase()}</span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-xs update-role-btn" data-id="${u._id}" data-role="${u.role || 'user'}">
                ${(u.role || 'user') === 'admin' ? 'Demote to User' : 'Promote to Admin'}
              </button>
              <button class="btn btn-danger btn-xs delete-user-btn" data-id="${u._id}">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind dynamic actions
      document.querySelectorAll('.update-role-btn').forEach(btn => {
        btn.addEventListener('click', () => updateRole(btn.getAttribute('data-id'), btn.getAttribute('data-role')));
      });
      document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(btn.getAttribute('data-id')));
      });

    } catch (err) {
      showError(err.message);
    }
  }

  // Fetch Whiteboards List
  async function loadBoardsList() {
    try {
      const res = await fetch('/api/admin/boards', { headers: getHeaders() });
      const boards = await handleResponse(res);
      if (!boards) return;

      const tbody = document.getElementById('boards-table-body');
      tbody.innerHTML = '';

      if (boards.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No active workspaces.</td></tr>`;
        return;
      }

      boards.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${b.title || 'Untitled Board'}</strong></td>
          <td>
            ${b.owner ? `
              <div>${b.owner.name}</div>
              <div style="font-size:11px; color:#64748B;">${b.owner.email}</div>
            ` : `<span style="color:#64748B;">Unknown Owner</span>`}
          </td>
          <td>
            <span class="badge ${b.isPublic ? 'success' : 'info'}">${b.isPublic ? 'Public View' : 'Private Share'}</span>
            <span style="font-size:12px; color:#94A3B8; margin-left:6px;">(${b.collaborators?.length || 0} collaborators)</span>
          </td>
          <td>${new Date(b.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-danger btn-xs delete-board-btn" data-id="${b._id}">Delete Board</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind actions
      document.querySelectorAll('.delete-board-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteBoard(btn.getAttribute('data-id')));
      });

    } catch (err) {
      showError(err.message);
    }
  }

  // Modify User Role
  async function updateRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to promote/demote this user to ${newRole.toUpperCase()}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      await handleResponse(res);
      await loadUsersList();
    } catch (err) {
      alert(err.message);
    }
  }

  // Delete User Account
  async function deleteUser(userId) {
    if (!confirm('WARNING: Deleting a user profile will permanently cascade delete all whiteboards they own. Are you sure you want to proceed?')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      await handleResponse(res);
      await loadAllData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Delete Whiteboard Override
  async function deleteBoard(boardId) {
    if (!confirm('Are you sure you want to permanently delete this whiteboard? This action is irreversible.')) return;

    try {
      const res = await fetch(`/api/admin/boards/${boardId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      await handleResponse(res);
      await loadAllData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Toggle Cache Mode Configuration
  const toggleInput = document.getElementById('cache-mode-toggle');
  toggleInput.addEventListener('change', async () => {
    const mode = toggleInput.checked ? 'redis' : 'memory';
    toggleInput.disabled = true;
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ mode })
      });
      const data = await handleResponse(res);
      if (data) {
        document.getElementById('active-cache-mode-label').textContent = data.activeCacheMode.toUpperCase();
        document.getElementById('toggle-status-text').textContent = data.activeCacheMode === 'redis' ? 'Using Redis Cache' : 'Using Memory Fallback';
      }
    } catch (err) {
      alert(err.message);
      toggleInput.checked = !toggleInput.checked;
    } finally {
      toggleInput.disabled = false;
    }
  });

  // Global Data Reloader
  async function loadAllData() {
    alertBox.style.display = 'none';
    await Promise.all([loadDashboardStats(), loadUsersList(), loadBoardsList()]);
  }

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
  }

  // Load all items
  loadAllData();

  // Log Out Control
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

})();
