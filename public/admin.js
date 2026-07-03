// Admin state
let isAdmin = false;

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const loginPassword = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginAlertContainer = document.getElementById('login-alert-container');
const actionAlertContainer = document.getElementById('action-alert-container');

// Stats DOM
const statTotal = document.getElementById('stat-total');
const statStatus = document.getElementById('stat-status');
const statWinnersCount = document.getElementById('stat-winners-count');

// Controls DOM
const winnerCountInput = document.getElementById('winner-count');
const drawBtn = document.getElementById('draw-btn');
const resetBtn = document.getElementById('reset-btn');
const controlPanel = document.getElementById('control-panel');
const adminTableBody = document.getElementById('admin-table-body');

// Check Admin Authentication
async function checkAuth() {
  try {
    const res = await fetch('/api/admin/check');
    const data = await res.json();
    if (data.isAdmin) {
      isAdmin = true;
      loginOverlay.classList.remove('active');
      loadDashboard();
    } else {
      isAdmin = false;
      loginOverlay.classList.add('active');
    }
  } catch (error) {
    console.error('Gagal mengecek status login:', error);
  }
}

// Load Dashboard Data
async function loadDashboard() {
  if (!isAdmin) return;
  await Promise.all([fetchStatus(), fetchParticipants()]);
}

// Fetch Status & Stats
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    statTotal.innerText = `${data.totalParticipants} / 100`;
    statWinnersCount.innerText = data.winners.length;

    if (data.status === 'active') {
      statStatus.innerHTML = `<span style="color: var(--success-color);"><i class="fa-solid fa-circle-play"></i> Aktif</span>`;
      drawBtn.disabled = false;
    } else {
      statStatus.innerHTML = `<span style="color: #fbbf24;"><i class="fa-solid fa-circle-check"></i> Selesai</span>`;
      drawBtn.disabled = true;
    }
  } catch (error) {
    console.error('Gagal mengambil status:', error);
  }
}

// Fetch & Render detailed participant table
async function fetchParticipants() {
  try {
    const res = await fetch('/api/admin/participants');
    if (!res.ok) {
      if (res.status === 401) {
        checkAuth();
        return;
      }
      throw new Error('Gagal mengambil data peserta');
    }
    const participants = await res.json();

    if (participants.length === 0) {
      adminTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
            <i class="fa-solid fa-users-slash" style="font-size: 1.5rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i> Belum ada peserta yang mendaftar.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    participants.forEach((p, idx) => {
      // Clean whatsapp number for the wa.me link
      const cleanPhone = p.whatsapp.replace(/\D/g, '').replace(/^0/, '62');
      const timeStr = new Date(p.createdAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      rowsHtml += `
        <tr>
          <td style="font-weight: 600;">${idx + 1}</td>
          <td style="font-weight: 600; color: var(--text-primary);">${escapeHTML(p.name)}</td>
          <td>
            <a href="https://wa.me/${cleanPhone}" target="_blank" class="wa-number" title="Hubungi via WhatsApp">
              <i class="fa-brands fa-whatsapp"></i> ${escapeHTML(p.whatsapp)}
            </a>
          </td>
          <td style="color: var(--text-secondary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(p.message)}">
            "${escapeHTML(p.message)}"
          </td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${timeStr}</td>
        </tr>
      `;
    });

    adminTableBody.innerHTML = rowsHtml;
  } catch (error) {
    adminTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--danger-color); padding: 3rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 1rem; display: block;"></i> ${error.message}
        </td>
      </tr>
    `;
  }
}

// Show local alerts
function showActionAlert(message, type = 'success') {
  actionAlertContainer.innerHTML = `
    <div class="alert alert-${type}">
      <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
      <span>${message}</span>
    </div>
  `;
}

// Escape HTML
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Admin Login Form Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = loginPassword.value;

  loginBtn.disabled = true;
  loginBtn.innerHTML = `<i class="fa-solid fa-spinner spinner"></i> Memproses...`;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (res.ok) {
      isAdmin = true;
      loginOverlay.classList.remove('active');
      loginPassword.value = '';
      loadDashboard();
    } else {
      loginAlertContainer.innerHTML = `
        <div class="alert alert-error" style="padding: 0.75rem 1rem; font-size: 0.9rem;">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>${data.error || 'Password salah!'}</span>
        </div>
      `;
    }
  } catch (error) {
    console.error(error);
    loginAlertContainer.innerHTML = `
      <div class="alert alert-error" style="padding: 0.75rem 1rem; font-size: 0.9rem;">
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>Koneksi server gagal.</span>
      </div>
    `;
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Masuk`;
  }
});

// Admin Logout Handler
logoutBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/admin/logout', { method: 'POST' });
    if (res.ok) {
      isAdmin = false;
      loginOverlay.classList.add('active');
      actionAlertContainer.innerHTML = '';
      adminTableBody.innerHTML = '';
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// Admin Draw Handler (Includes high-end gacha shuffling animation!)
drawBtn.addEventListener('click', async () => {
  const winnerCount = parseInt(winnerCountInput.value) || 1;
  
  // Quick clientside validation
  const totalStr = statTotal.innerText.split(' ')[0];
  const participantsCountVal = parseInt(totalStr) || 0;

  if (participantsCountVal === 0) {
    showActionAlert('Tidak ada peserta untuk diundi!', 'error');
    return;
  }

  // Confirm drawing
  if (!confirm(`Apakah Anda yakin ingin mengundi ${winnerCount} pemenang sekarang?`)) {
    return;
  }

  // 1. Shuffling Animation (Gacha Effect!)
  drawBtn.disabled = true;
  resetBtn.disabled = true;
  controlPanel.classList.add('drum-roll');
  
  let animationInterval;
  const originalRowsHtml = adminTableBody.innerHTML;
  const rows = Array.from(adminTableBody.querySelectorAll('tr'));
  
  if (rows.length > 1) {
    let tick = 0;
    // Visually highlight random rows to simulate the drawing process
    animationInterval = setInterval(() => {
      // Remove previous highlights
      rows.forEach(r => r.style.background = '');
      
      // Select random rows to highlight
      for (let i = 0; i < Math.min(winnerCount, rows.length); i++) {
        const randIdx = Math.floor(Math.random() * rows.length);
        if (rows[randIdx]) {
          rows[randIdx].style.background = 'rgba(251, 191, 36, 0.2)'; // Gold glow
        }
      }
      
      drawBtn.innerHTML = `<i class="fa-solid fa-spinner spinner"></i> Mengacak Peserta (${3 - Math.floor(tick / 5)}s)...`;
      tick++;
    }, 100);
  } else {
    drawBtn.innerHTML = `<i class="fa-solid fa-spinner spinner"></i> Mengacak...`;
  }

  // Wait 2.5 seconds for the suspenseful shuffling animation to complete
  setTimeout(async () => {
    clearInterval(animationInterval);
    controlPanel.classList.remove('drum-roll');
    
    // Reset any temporary visual highlights
    rows.forEach(r => r.style.background = '');
    
    try {
      // 2. Trigger actual backend draw
      const res = await fetch('/api/admin/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: winnerCount })
      });

      const data = await res.json();

      if (res.ok) {
        let winnerListStr = data.winners.map(w => w.name).join(', ');
        showActionAlert(`Pengundian Selesai! Pemenang: ${winnerListStr}`, 'success');
        await loadDashboard();
      } else {
        showActionAlert(data.error || 'Terjadi kesalahan saat mengacak.', 'error');
        // Restore table back to original if error
        adminTableBody.innerHTML = originalRowsHtml;
      }
    } catch (error) {
      showActionAlert('Koneksi server gagal. Gagal mengundi pemenang.', 'error');
      adminTableBody.innerHTML = originalRowsHtml;
    } finally {
      drawBtn.disabled = true; // Stay disabled until reset
      resetBtn.disabled = false;
      drawBtn.innerHTML = `<i class="fa-solid fa-dice"></i> ACAK PEMENANG!`;
    }
  }, 2500);
});

// Admin Reset Handler
resetBtn.addEventListener('click', async () => {
  if (!confirm('PENTING: Apakah Anda yakin ingin me-reset giveaway? Semua data peserta dan pemenang akan DIHAPUS PERMANEN!')) {
    return;
  }

  try {
    const res = await fetch('/api/admin/reset', { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      showActionAlert(data.message, 'success');
      winnerCountInput.value = '1';
      await loadDashboard();
    } else {
      showActionAlert(data.error || 'Gagal me-reset giveaway.', 'error');
    }
  } catch (error) {
    showActionAlert('Koneksi server gagal. Gagal me-reset.', 'error');
  }
});

// Check auth and load dashboard on load
checkAuth();
