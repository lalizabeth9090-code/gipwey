// State variables
let currentStatus = 'active';
let totalParticipants = 0;
let lastWinnersJson = '';

// DOM Elements
const registrationForm = document.getElementById('registration-form');
const registrationPanel = document.getElementById('registration-panel');
const closedPanel = document.getElementById('closed-panel');
const winnerContainer = document.getElementById('winner-container');
const participantsGrid = document.getElementById('participants-grid');
const participantsCount = document.getElementById('participants-count');
const slotsText = document.getElementById('slots-text');
const alertContainer = document.getElementById('alert-container');
const submitBtn = document.getElementById('submit-btn');

// Confetti Engine
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let animationFrameId = null;
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

class ConfettiParticle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height - canvas.height;
    this.size = Math.random() * 8 + 5;
    this.color = `hsl(${Math.random() * 360}, 90%, 55%)`;
    this.speed = Math.random() * 4 + 2;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = Math.random() * 0.1 - 0.05;
    this.shape = Math.random() > 0.5 ? 'circle' : 'rect';
  }
  update() {
    this.y += this.speed;
    this.x += Math.sin(this.angle) * 0.6;
    this.angle += this.spin;
    if (this.y > canvas.height) {
      this.y = -20;
      this.x = Math.random() * canvas.width;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }
    ctx.restore();
  }
}

function startConfetti() {
  if (animationFrameId !== null) return;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  particles = [];
  for (let i = 0; i < 120; i++) {
    particles.push(new ConfettiParticle());
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    animationFrameId = requestAnimationFrame(animate);
  }
  animate();
}

function stopConfetti() {
  if (animationFrameId === null) return;
  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.removeEventListener('resize', resizeCanvas);
}

// Display Alerts
function showAlert(message, type = 'success') {
  alertContainer.innerHTML = `
    <div class="alert alert-${type}">
      <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
      <span>${message}</span>
    </div>
  `;
}

// Fetch Giveaway Status and Winners
async function updateStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    
    currentStatus = data.status;
    totalParticipants = data.totalParticipants;
    
    // Update badge / slot info
    slotsText.innerText = `${totalParticipants} / 100 Peserta`;
    participantsCount.innerText = totalParticipants;

    // Handle Active/Finished UI transitions
    if (currentStatus === 'finished') {
      registrationPanel.style.display = 'none';
      closedPanel.style.display = 'block';
      
      const winnersJsonStr = JSON.stringify(data.winners);
      if (lastWinnersJson !== winnersJsonStr) {
        lastWinnersJson = winnersJsonStr;
        renderWinners(data.winners);
        startConfetti();
      }
    } else {
      registrationPanel.style.display = 'block';
      closedPanel.style.display = 'none';
      winnerContainer.style.display = 'none';
      lastWinnersJson = '';
      stopConfetti();
    }
  } catch (error) {
    console.error('Gagal mengambil status giveaway:', error);
  }
}

// Render Winners
function renderWinners(winners) {
  if (!winners || winners.length === 0) return;
  
  let winnersHtml = '';
  winners.forEach(w => {
    winnersHtml += `
      <div class="winner-item">
        <div class="winner-name"><i class="fa-solid fa-crown"></i> ${escapeHTML(w.name)}</div>
        <div class="winner-msg">"${escapeHTML(w.message)}"</div>
      </div>
    `;
  });

  winnerContainer.innerHTML = `
    <div class="winner-card">
      <div class="winner-badge"><i class="fa-solid fa-trophy"></i> PEMENANG GIPWEY!</div>
      <div class="winner-names">
        ${winnersHtml}
      </div>
      <p class="winner-desc">Selamat kepada para pemenang! Silakan hubungi admin untuk pengambilan hadiah.</p>
    </div>
  `;
  winnerContainer.style.display = 'block';
}

// Fetch & Render Participants
async function updateParticipants() {
  try {
    const res = await fetch('/api/participants');
    const participants = await res.json();
    
    if (participants.length === 0) {
      participantsGrid.innerHTML = `
        <div class="no-participants">
          <i class="fa-solid fa-users-slash"></i>
          <p>Belum ada peserta yang mendaftar. Jadilah yang pertama!</p>
        </div>
      `;
      return;
    }

    let cardsHtml = '';
    const avatarColors = [
      'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
    ];
    participants.forEach((p, idx) => {
      const timeStr = new Date(p.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const nameSum = p.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colorIdx = Math.abs(nameSum) % avatarColors.length;
      const avatarBg = avatarColors[colorIdx];
      const initial = (p.name.trim().charAt(0) || '?').toUpperCase();
      
      cardsHtml += `
        <div class="participant-card" style="animation: scale-up 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: ${Math.min(idx * 0.04, 1.2)}s;">
          <div class="participant-card-top">
            <div class="participant-avatar" style="background: ${avatarBg};">${initial}</div>
            <div class="participant-meta">
              <div class="participant-card-name" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</div>
              <div class="participant-card-date">${timeStr}</div>
            </div>
            <span class="participant-card-badge">#${idx + 1}</span>
          </div>
          <div class="participant-card-msg">"${escapeHTML(p.message)}"</div>
        </div>
      `;
    });
    
    participantsGrid.innerHTML = cardsHtml;
  } catch (error) {
    console.error('Gagal mengambil daftar peserta:', error);
  }
}

// Helper to escape HTML strings (security)
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

// Submit Registration Form
registrationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value;
  const whatsapp = document.getElementById('whatsapp').value;
  const message = document.getElementById('message').value;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner spinner"></i> Mendaftar...`;
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, whatsapp, message })
    });

    const data = await response.json();

    if (response.ok) {
      showAlert(data.message, 'success');
      registrationForm.reset();
      updateStatus();
      updateParticipants();
    } else {
      showAlert(data.error || 'Terjadi kesalahan.', 'error');
    }
  } catch (error) {
    showAlert('Koneksi server gagal. Coba lagi nanti.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Daftar Sekarang`;
  }
});

// Initialization
updateStatus();
updateParticipants();

// Start periodic polling every 3 seconds
setInterval(() => {
  updateStatus();
  updateParticipants();
}, 3000);
