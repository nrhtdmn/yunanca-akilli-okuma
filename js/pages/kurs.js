/* ============================================================
 * KURS PANELİ — Öğretmen & Öğrenci Yönetim Sistemi
 * ============================================================ */

// --- VERİ ---
let kursClasses     = JSON.parse(localStorage.getItem('y_kurs_classes'))      || [];
let kursAssignments = JSON.parse(localStorage.getItem('y_kurs_assignments'))  || [];
let kursSubmissions = JSON.parse(localStorage.getItem('y_kurs_submissions'))  || {};

// Aktif oturum (öğrenci ödev çözerken)
let kursActiveSession = null;
let kursExamSession   = null;

function saveKursData() {
  localStorage.setItem('y_kurs_classes',      JSON.stringify(kursClasses));
  localStorage.setItem('y_kurs_assignments',  JSON.stringify(kursAssignments));
  localStorage.setItem('y_kurs_submissions',  JSON.stringify(kursSubmissions));
}

// --- YETKİ ---
function kursIsTeacher() {
  return currentUser && (currentUser.role === 'teacher' || currentUser.role === 'admin');
}

// ============================================================
// ANA RENDER
// ============================================================
window.renderKursPanel = function () {
  const loginPrompt  = document.getElementById('kurs-login-prompt');
  const teacherView  = document.getElementById('kurs-teacher-view');
  const studentView  = document.getElementById('kurs-student-view');

  if (!currentUser) {
    loginPrompt.style.display  = 'block';
    teacherView.style.display  = 'none';
    studentView.style.display  = 'none';
    return;
  }

  loginPrompt.style.display = 'none';

  if (kursIsTeacher()) {
    teacherView.style.display = 'block';
    studentView.style.display = 'none';
    renderKursClasses();
    // İlk sekme aktif
    document.querySelectorAll('#kurs-teacher-tabs .sub-tab-btn')[0].classList.add('active');
  } else {
    teacherView.style.display = 'none';
    studentView.style.display = 'block';
    renderStudentAssignments();
  }
};

// ============================================================
// ÖĞRETMEN — SEKME
// ============================================================
window.switchKursTab = function (tab, btn) {
  ['classes', 'assign', 'reports'].forEach(t => {
    const el = document.getElementById('kurs-panel-' + t);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('#kurs-teacher-tabs .sub-tab-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('kurs-panel-' + tab);
  if (panel) panel.style.display = 'block';
  if (btn)   btn.classList.add('active');

  if (tab === 'assign')  renderAssignForm();
  if (tab === 'reports') renderTeacherReports();
};

// ============================================================
// ÖĞRETMEN — SINIF YÖNETİMİ
// ============================================================
window.renderKursClasses = function () {
  const container = document.getElementById('kurs-classes-list');
  if (!container) return;

  const myClasses = kursClasses.filter(c => c.teacherUsername === currentUsername);

  if (myClasses.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-dim);">
      <div style="font-size:3rem; margin-bottom:10px;">🏫</div>
      <p>Henüz bir sınıfınız yok.<br>Yukarıdan yeni sınıf oluşturun.</p>
    </div>`;
    return;
  }

  container.innerHTML = myClasses.map(cls => {
    const submCount = _classSubCount(cls.id);
    const studentRows = cls.studentUsernames.length === 0
      ? '<p style="color:var(--text-dim); padding:10px 0;">Henüz öğrenci yok.</p>'
      : cls.studentUsernames.map(uname => {
          const u = dbUsers[uname];
          const badge = u ? (u.status === 'approved' ? '✅' : '⏳ Onay Bekliyor') : '❓ Kayıtsız';
          return `<div style="display:flex; justify-content:space-between; align-items:center;
                      padding:10px 0; border-bottom:1px solid var(--border);">
            <span>${badge} <strong>${uname}</strong></span>
            <button onclick="removeStudentFromClass('${cls.id}','${uname}')"
              style="background:none; border:none; color:var(--error); cursor:pointer; font-size:0.85rem;">Çıkar</button>
          </div>`;
        }).join('');

    return `
      <div class="deck-section" style="margin-bottom:15px; border:1px solid var(--border); border-radius:12px; overflow:hidden;">
        <div class="deck-header" onclick="toggleAccordion('kcls_${cls.id}')"
          style="padding:18px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <strong style="font-size:1.15rem;">🏫 ${cls.name}</strong>
            <span style="color:var(--text-dim); font-size:0.85rem; margin-left:12px;">
              ${cls.studentUsernames.length} öğrenci · ${submCount} teslim
            </span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="secondary-btn" style="padding:6px 14px; font-size:0.85rem;"
              onclick="event.stopPropagation(); openAddStudentModal('${cls.id}')">+ Öğrenci Ekle</button>
            <button onclick="event.stopPropagation(); deleteClass('${cls.id}')"
              style="background:none; border:none; color:var(--error); cursor:pointer; font-size:1.2rem;" title="Sınıfı Sil">🗑️</button>
            <span class="deck-arrow" id="arrow-kcls_${cls.id}">▼</span>
          </div>
        </div>
        <div class="deck-content" id="content-kcls_${cls.id}" style="padding:15px 20px;">
          ${studentRows}
        </div>
      </div>`;
  }).join('');
};

function _classSubCount(classId) {
  const asgns = kursAssignments.filter(a => a.classId === classId);
  return asgns.reduce((sum, a) =>
    sum + Object.keys(kursSubmissions).filter(k => k.startsWith(a.id + '_')).length, 0);
}

window.createClass = function () {
  if (!kursIsTeacher()) { showToastMessage('❌ Bu işlem için öğretmen yetkisi gerekli.'); return; }
  const input = document.getElementById('new-class-name');
  const name  = input.value.trim();
  if (!name) { showToastMessage('❌ Sınıf adı boş olamaz.'); return; }

  kursClasses.push({
    id: 'cls_' + Date.now(),
    name,
    teacherUsername: currentUsername,
    studentUsernames: [],
    createdAt: new Date().toISOString()
  });
  saveKursData();
  input.value = '';
  renderKursClasses();
  showToastMessage('✅ Sınıf oluşturuldu: ' + name);
};

window.deleteClass = function (classId) {
  if (!confirm('Bu sınıfı silmek istediğinize emin misiniz?')) return;
  kursClasses = kursClasses.filter(c => c.id !== classId);
  saveKursData();
  renderKursClasses();
  showToastMessage('Sınıf silindi.');
};

window.openAddStudentModal = function (classId) {
  const cls = kursClasses.find(c => c.id === classId);
  if (!cls) return;

  const available = Object.keys(dbUsers).filter(u =>
    u !== currentUsername &&
    !cls.studentUsernames.includes(u) &&
    dbUsers[u].role !== 'admin' &&
    dbUsers[u].role !== 'teacher'
  );

  document.getElementById('kurs-add-student-classid').value = classId;
  document.getElementById('kurs-student-select').innerHTML = available.length > 0
    ? available.map(u => `<option value="${u}">${u} (${dbUsers[u].status === 'approved' ? 'Onaylı' : 'Beklemede'})</option>`).join('')
    : '<option value="">-- Eklenebilecek kullanıcı yok --</option>';

  document.getElementById('kurs-add-student-modal').style.display = 'flex';
};

window.closeAddStudentModal = function () {
  document.getElementById('kurs-add-student-modal').style.display = 'none';
};

window.addStudentToClass = function () {
  const classId  = document.getElementById('kurs-add-student-classid').value;
  const username = document.getElementById('kurs-student-select').value;
  if (!username) { showToastMessage('❌ Lütfen bir kullanıcı seçin.'); return; }

  const cls = kursClasses.find(c => c.id === classId);
  if (!cls) return;
  if (cls.studentUsernames.includes(username)) { showToastMessage('❌ Bu öğrenci zaten sınıfta.'); return; }

  cls.studentUsernames.push(username);
  saveKursData();
  closeAddStudentModal();
  renderKursClasses();
  showToastMessage('✅ ' + username + ' sınıfa eklendi.');
};

window.removeStudentFromClass = function (classId, username) {
  const cls = kursClasses.find(c => c.id === classId);
  if (!cls) return;
  cls.studentUsernames = cls.studentUsernames.filter(u => u !== username);
  saveKursData();
  renderKursClasses();
  showToastMessage(username + ' sınıftan çıkarıldı.');
};

// ============================================================
// ÖĞRETMEN — ÖDEV ATAMA
// ============================================================
window.renderAssignForm = function () {
  const myClasses   = kursClasses.filter(c => c.teacherUsername === currentUsername);
  const targetSel   = document.getElementById('assign-target-select');

  let optHtml = '<option value="">-- Kime Atanacak? --</option>';
  optHtml += '<optgroup label="📦 Sınıflar">';
  myClasses.forEach(cls => {
    optHtml += `<option value="class:${cls.id}">🏫 ${cls.name} (${cls.studentUsernames.length} öğrenci)</option>`;
  });
  optHtml += '</optgroup>';

  const allStudents = [...new Set(myClasses.flatMap(c => c.studentUsernames))];
  if (allStudents.length > 0) {
    optHtml += '<optgroup label="👤 Bireysel Öğrenciler">';
    allStudents.forEach(u => { optHtml += `<option value="student:${u}">👤 ${u}</option>`; });
    optHtml += '</optgroup>';
  }

  if (targetSel) targetSel.innerHTML = optHtml;
  onAssignTypeChange();
};

window.onAssignTypeChange = function () {
  const type         = document.getElementById('assign-type-select').value;
  const contentSel   = document.getElementById('assign-content-select');
  const examCatGroup = document.getElementById('assign-exam-cat-group');

  if (type === 'practice') {
    examCatGroup.style.display = 'none';
    contentSel.innerHTML = '<option value="">-- Alıştırma Seçin --</option>' +
      PRACTICE_CATALOG.map(p =>
        `<option value="${p.id}">${p.title} (${p.level})</option>`
      ).join('');
    contentSel.onchange = null;
  } else {
    examCatGroup.style.display = 'block';
    const exams = [...new Set(GLOBAL_SORU_BANKASI.map(q => q.exam))].sort();
    contentSel.innerHTML = '<option value="">-- Sınav Seçin --</option>' +
      exams.map(e => `<option value="${e}">${e}</option>`).join('');
    contentSel.onchange = renderExamCategoryOptions;
    document.getElementById('assign-exam-cat-select').innerHTML =
      '<option value="">-- Önce sınav seçin --</option>';
  }
};

window.renderExamCategoryOptions = function () {
  const examName = document.getElementById('assign-content-select').value;
  const catSel   = document.getElementById('assign-exam-cat-select');
  if (!examName) { catSel.innerHTML = '<option value="">-- Önce sınav seçin --</option>'; return; }
  const cats = [...new Set(GLOBAL_SORU_BANKASI.filter(q => q.exam === examName).map(q => q.category))];
  catSel.innerHTML = '<option value="">-- Kategori Seçin --</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
};

window.submitAssignment = function () {
  const target    = document.getElementById('assign-target-select').value;
  const type      = document.getElementById('assign-type-select').value;
  const contentId = document.getElementById('assign-content-select').value;
  const dueDate   = document.getElementById('assign-due-date').value;

  if (!target)    { showToastMessage('❌ Hedef seçin.'); return; }
  if (!contentId) { showToastMessage('❌ İçerik seçin.'); return; }

  let studentUsernames = [], classId = null;

  if (target.startsWith('class:')) {
    classId = target.replace('class:', '');
    const cls = kursClasses.find(c => c.id === classId);
    if (!cls || cls.studentUsernames.length === 0) {
      showToastMessage('❌ Sınıfta öğrenci yok.'); return;
    }
    studentUsernames = [...cls.studentUsernames];
  } else {
    studentUsernames = [target.replace('student:', '')];
  }

  let contentTitle = '', examCategory = null;

  if (type === 'practice') {
    const prac   = PRACTICE_CATALOG.find(p => p.id === contentId);
    contentTitle = prac ? prac.title : contentId;
  } else {
    examCategory = document.getElementById('assign-exam-cat-select').value;
    if (!examCategory) { showToastMessage('❌ Sınav kategorisi seçin.'); return; }
    contentTitle = contentId + ' — ' + examCategory;
  }

  kursAssignments.push({
    id: 'asgn_' + Date.now(),
    teacherUsername: currentUsername,
    classId,
    studentUsernames,
    type,
    contentId,
    contentTitle,
    examCategory,
    dueDate: dueDate || null,
    createdAt: new Date().toISOString()
  });

  saveKursData();
  showToastMessage(`✅ Ödev atandı → ${studentUsernames.length} öğrenci`);

  // Formu sıfırla
  document.getElementById('assign-target-select').value  = '';
  document.getElementById('assign-content-select').value = '';
  document.getElementById('assign-due-date').value       = '';
};

// ============================================================
// ÖĞRETMEN — RAPORLAR
// ============================================================
window.renderTeacherReports = function () {
  const container = document.getElementById('kurs-reports-container');
  if (!container) return;

  const mine   = kursAssignments.filter(a => a.teacherUsername === currentUsername);
  const sorted = [...mine].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (sorted.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-dim);">
      <div style="font-size:3rem; margin-bottom:10px;">📊</div>
      <p>Henüz ödev atanmadı.</p>
    </div>`;
    return;
  }

  container.innerHTML = sorted.map(asgn => {
    const now        = new Date();
    const isOverdue  = asgn.dueDate && new Date(asgn.dueDate) < now;
    const typeIcon   = asgn.type === 'practice' ? '💪' : '📝';

    const rows = asgn.studentUsernames.map(uname => {
      const key = asgn.id + '_' + uname;
      const sub = kursSubmissions[key];

      if (!sub) {
        const badge = isOverdue
          ? '<span style="color:var(--error);">❌ Teslim Etmedi</span>'
          : '<span style="color:var(--text-dim);">⏳ Bekliyor</span>';
        return `<tr>
          <td style="padding:10px 12px; border-bottom:1px solid var(--border);">${uname}</td>
          <td style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">${badge}</td>
          <td colspan="4" style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border); color:var(--text-dim);">—</td>
        </tr>`;
      }

      const sc = sub.score >= 70 ? 'var(--success)' : sub.score >= 50 ? 'var(--accent2)' : 'var(--error)';
      return `<tr>
        <td style="padding:10px 12px; border-bottom:1px solid var(--border);">${uname}</td>
        <td style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">
          <span style="color:var(--success);">✅ Teslim</span></td>
        <td style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);
            font-weight:bold; font-size:1.1rem; color:${sc};">%${sub.score}</td>
        <td style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">
          <span style="color:var(--success);">${sub.correct}</span> /
          <span style="color:var(--error);">${sub.wrong}</span> /
          <span style="color:var(--text-dim);">${sub.empty}</span></td>
        <td style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">${formatExamTime(sub.timeSpent)}</td>
        <td style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);
            font-size:0.8rem; color:var(--text-dim);">
          ${new Date(sub.completedAt).toLocaleString('tr-TR', {dateStyle:'short', timeStyle:'short'})}</td>
      </tr>`;
    }).join('');

    const subs      = asgn.studentUsernames.map(u => kursSubmissions[asgn.id + '_' + u]).filter(Boolean);
    const completed = subs.length;
    const total     = asgn.studentUsernames.length;
    const avgScore  = completed > 0 ? Math.round(subs.reduce((s, x) => s + x.score, 0) / completed) : 0;

    const dueBadge = asgn.dueDate
      ? (isOverdue
          ? '<span style="color:var(--error); font-size:0.8rem;">⏰ Süresi Doldu</span>'
          : `<span style="color:var(--accent2); font-size:0.8rem;">⏳ ${new Date(asgn.dueDate).toLocaleDateString('tr-TR')}'e kadar</span>`)
      : '<span style="color:var(--text-dim); font-size:0.8rem;">Süresiz</span>';

    return `
      <div class="deck-section" style="margin-bottom:15px; border:1px solid var(--border); border-radius:12px; overflow:hidden;">
        <div class="deck-header" onclick="toggleAccordion('rpt_${asgn.id}')"
          style="padding:15px 20px; background:var(--surface-alt); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <strong>${typeIcon} ${asgn.contentTitle}</strong>
            <span style="color:var(--text-dim); font-size:0.85rem; margin-left:10px;">
              ${new Date(asgn.createdAt).toLocaleDateString('tr-TR')}
            </span>
            <span style="margin-left:10px;">${dueBadge}</span>
          </div>
          <div style="display:flex; gap:20px; align-items:center;">
            <div style="text-align:center;">
              <div style="font-size:1.2rem; font-weight:bold; color:var(--success);">${completed}/${total}</div>
              <div style="font-size:0.75rem; color:var(--text-dim);">Teslim</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:1.2rem; font-weight:bold; color:var(--accent2);">%${avgScore}</div>
              <div style="font-size:0.75rem; color:var(--text-dim);">Ort. Puan</div>
            </div>
            <button onclick="event.stopPropagation(); deleteAssignment('${asgn.id}')"
              style="background:none; border:none; color:var(--error); cursor:pointer; font-size:1.2rem;">🗑️</button>
            <span class="deck-arrow" id="arrow-rpt_${asgn.id}">▼</span>
          </div>
        </div>
        <div class="deck-content" id="content-rpt_${asgn.id}" style="padding:0; overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <thead>
              <tr style="background:var(--surface-alt);">
                <th style="padding:10px 12px; text-align:left; border-bottom:1px solid var(--border);">Öğrenci</th>
                <th style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">Durum</th>
                <th style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">Puan</th>
                <th style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">D / Y / B</th>
                <th style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">Süre</th>
                <th style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">Tarih</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
};

window.deleteAssignment = function (assignmentId) {
  if (!confirm('Bu ödevi silmek istediğinize emin misiniz?\nÖğrenci teslimler de silinecek.')) return;
  kursAssignments = kursAssignments.filter(a => a.id !== assignmentId);
  Object.keys(kursSubmissions).forEach(k => {
    if (k.startsWith(assignmentId + '_')) delete kursSubmissions[k];
  });
  saveKursData();
  renderTeacherReports();
  showToastMessage('Ödev silindi.');
};

// ============================================================
// ÖĞRENCİ — ÖDEV LİSTESİ
// ============================================================
window.renderStudentAssignments = function () {
  const container = document.getElementById('kurs-student-assignments');
  if (!container) return;

  // Workspace gizle, liste göster
  const ws = document.getElementById('kurs-task-workspace');
  if (ws) ws.style.display = 'none';
  container.style.display = 'block';

  const mine = kursAssignments.filter(a => a.studentUsernames.includes(currentUsername));

  if (mine.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-dim);">
      <div style="font-size:3rem; margin-bottom:10px;">📭</div>
      <p>Henüz size atanmış bir ödev yok.</p>
    </div>`;
    return;
  }

  const now = new Date();
  const withStatus = mine.map(a => {
    const sub      = kursSubmissions[a.id + '_' + currentUsername];
    const overdue  = a.dueDate && new Date(a.dueDate) < now;
    const status   = sub ? 'completed' : (overdue ? 'overdue' : 'pending');
    return { ...a, sub, status };
  });

  const order = { pending: 0, overdue: 1, completed: 2 };
  withStatus.sort((a, b) => order[a.status] - order[b.status]);

  const groups = [
    { key: 'pending',   label: '📋 Bekleyen Ödevler',    color: 'var(--accent)' },
    { key: 'overdue',   label: '⏰ Süresi Dolmuş',        color: 'var(--error)' },
    { key: 'completed', label: '✅ Tamamlanan Ödevler',   color: 'var(--success)' },
  ];

  container.innerHTML = groups.map(g => {
    const items = withStatus.filter(a => a.status === g.key);
    if (items.length === 0) return '';
    return `<h3 style="color:${g.color}; margin:20px 0 10px; font-size:1.1rem;">${g.label}</h3>
      ${items.map(a => _studentCard(a)).join('')}`;
  }).join('');
};

function _studentCard(asgn) {
  const typeIcon  = asgn.type === 'practice' ? '💪' : '📝';
  const typeLabel = asgn.type === 'practice' ? 'Alıştırma' : 'Sınav';

  let dueBadge = '';
  if (asgn.dueDate && asgn.status === 'pending') {
    const days = Math.ceil((new Date(asgn.dueDate) - new Date()) / 86400000);
    dueBadge = days <= 1
      ? `<span style="color:var(--error); font-size:0.85rem;">⚠️ Son gün!</span>`
      : `<span style="color:var(--accent2); font-size:0.85rem;">⏳ ${days} gün kaldı</span>`;
  } else if (!asgn.dueDate) {
    dueBadge = `<span style="color:var(--text-dim); font-size:0.85rem;">Süresiz</span>`;
  }

  let action = '';
  if (asgn.status === 'completed') {
    const sub = asgn.sub;
    const sc  = sub.score >= 70 ? 'var(--success)' : sub.score >= 50 ? 'var(--accent2)' : 'var(--error)';
    action = `<div style="text-align:right; min-width:90px;">
      <div style="font-size:1.8rem; font-weight:bold; color:${sc};">%${sub.score}</div>
      <div style="font-size:0.8rem; color:var(--text-dim);">${sub.correct}D / ${sub.wrong}Y / ${sub.empty}B</div>
      <div style="font-size:0.75rem; color:var(--text-dim);">
        ${new Date(sub.completedAt).toLocaleString('tr-TR', {dateStyle:'short', timeStyle:'short'})}
      </div>
    </div>`;
  } else if (asgn.status === 'overdue') {
    action = `<button class="secondary-btn" style="color:var(--error); border-color:var(--error);" disabled>Süresi Doldu</button>`;
  } else {
    action = `<button class="main-btn" style="padding:10px 22px; white-space:nowrap;"
      onclick="startKursTask('${asgn.id}')">Başla ➔</button>`;
  }

  return `<div style="background:var(--surface-alt); border:1px solid var(--border); border-radius:12px;
      padding:18px 20px; margin-bottom:12px; display:flex; justify-content:space-between;
      align-items:center; gap:15px; flex-wrap:wrap;">
    <div style="flex:1; min-width:180px;">
      <div style="font-size:1.05rem; font-weight:bold; margin-bottom:6px;">${typeIcon} ${asgn.contentTitle}</div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <span style="background:rgba(79,142,247,0.15); color:var(--accent); padding:3px 10px; border-radius:20px; font-size:0.8rem;">${typeLabel}</span>
        ${dueBadge}
        <span style="color:var(--text-dim); font-size:0.8rem;">Öğretmen: ${asgn.teacherUsername}</span>
      </div>
    </div>
    <div>${action}</div>
  </div>`;
}

// ============================================================
// ÖĞRENCİ — ÖDEV BAŞLAT
// ============================================================
window.startKursTask = function (assignmentId) {
  if (!currentUser) { showAuthModal(); return; }
  const asgn = kursAssignments.find(a => a.id === assignmentId);
  if (!asgn) { showToastMessage('❌ Ödev bulunamadı.'); return; }

  kursActiveSession = { assignmentId, type: asgn.type, startTime: Date.now() };

  if (asgn.type === 'practice') _startKursPractice(asgn);
  else                          _startKursExam(asgn);
};

function _showKursWorkspace() {
  document.getElementById('kurs-student-assignments').style.display = 'none';
  const ws = document.getElementById('kurs-task-workspace');
  ws.style.display = 'block';
  return ws;
}

// ============================================================
// ÖĞRENCİ — ALIŞTIRMA MODU
// ============================================================
function _startKursPractice(asgn) {
  const prac = PRACTICE_CATALOG.find(p => p.id === asgn.contentId);
  if (!prac) { showToastMessage('❌ Alıştırma veritabanında bulunamadı.'); return; }

  const ws = _showKursWorkspace();

  let questHtml = '';
  prac.questions.forEach((q, idx) => {
    if (q.type === 'tf') {
      questHtml += `
        <div style="margin-bottom:18px; padding:15px; background:var(--surface-alt); border-radius:8px; border:1px solid var(--border);">
          <p style="font-weight:bold; margin-bottom:10px;">${idx + 1}. ${q.question}</p>
          <div style="display:flex; gap:15px;">
            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
              <input type="radio" name="kq_${q.id}" value="true"> ✅ Doğru</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
              <input type="radio" name="kq_${q.id}" value="false"> ❌ Yanlış</label>
          </div>
        </div>`;
    } else if (q.type === 'mc') {
      questHtml += `
        <div style="margin-bottom:18px; padding:15px; background:var(--surface-alt); border-radius:8px; border:1px solid var(--border);">
          <p style="font-weight:bold; margin-bottom:10px;">${idx + 1}. ${q.question}</p>
          ${q.options.map((opt, i) =>
            `<label style="display:block; cursor:pointer; margin-bottom:6px; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--surface);">
              <input type="radio" name="kq_${q.id}" value="${i}"> ${opt}
            </label>`
          ).join('')}
        </div>`;
    } else if (q.type === 'fill-write') {
      questHtml += `
        <div style="margin-bottom:18px; padding:15px; background:var(--surface-alt); border-radius:8px; border:1px solid var(--border);">
          <p style="font-weight:bold; margin-bottom:8px;">${idx + 1}. Boşluğu doldurun:</p>
          <p style="line-height:2.2; font-size:1rem;">
            ${q.before}
            <input type="text" id="kfill_${q.id}"
              style="border:none; border-bottom:2px solid var(--accent); background:transparent; color:var(--text);
                font-size:1rem; min-width:120px; text-align:center; outline:none; padding:2px 6px;">
            ${q.after}
          </p>
        </div>`;
    } else if (q.type === 'fill-select') {
      questHtml += `
        <div style="margin-bottom:18px; padding:15px; background:var(--surface-alt); border-radius:8px; border:1px solid var(--border);">
          <p style="font-weight:bold; margin-bottom:8px;">${idx + 1}. Uygun seçeneği seçin:</p>
          <p style="line-height:2.2; font-size:1rem;">
            ${q.before}
            <select id="kfill_${q.id}"
              style="border:1px solid var(--accent); background:var(--surface); color:var(--text); border-radius:4px; padding:4px 10px;">
              <option value="">seçin</option>
              ${q.options.map(o => `<option value="${o}">${o}</option>`).join('')}
            </select>
            ${q.after}
          </p>
        </div>`;
    }
  });

  ws.innerHTML = `
    <div>
      <div class="player-header" style="margin-bottom:20px;">
        <button class="secondary-btn" onclick="cancelKursTask()">🔙 Geri Dön</button>
        <h4 class="active-video-title">${prac.title}</h4>
      </div>
      <div class="practice-split-layout">
        <div class="practice-text-panel">
          <h3 style="color:var(--accent); margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">📖 Metin</h3>
          <div style="font-size:1.1rem; line-height:1.85; color:var(--text);">${prac.text}</div>
        </div>
        <div class="practice-questions-panel">
          <h3 style="color:var(--accent2); margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">🧠 Sorular</h3>
          <div id="kurs-prac-questions">${questHtml}</div>
          <button class="main-btn" id="kurs-prac-submit-btn"
            style="width:100%; padding:15px; background:var(--success); margin-top:15px;"
            onclick="submitKursPractice()">✅ Ödevi Teslim Et</button>
          <div id="kurs-prac-result" style="margin-top:15px; display:none;"></div>
        </div>
      </div>
    </div>`;
}

window.submitKursPractice = function () {
  const { assignmentId, startTime } = kursActiveSession;
  const asgn = kursAssignments.find(a => a.id === assignmentId);
  const prac = PRACTICE_CATALOG.find(p => p.id === asgn.contentId);

  let correct = 0, wrong = 0, empty = 0;

  prac.questions.forEach(q => {
    let userAnswer = null;
    if (q.type === 'tf' || q.type === 'mc') {
      document.querySelectorAll(`input[name="kq_${q.id}"]`).forEach(r => {
        if (r.checked) userAnswer = r.value;
      });
    } else if (q.type === 'fill-write' || q.type === 'fill-select') {
      const el = document.getElementById('kfill_' + q.id);
      userAnswer = el ? el.value.trim().toLowerCase() : null;
    }

    if (!userAnswer || userAnswer === '') empty++;
    else if (userAnswer === String(q.answer).toLowerCase()) correct++;
    else wrong++;
  });

  const total     = prac.questions.length;
  const score     = Math.round((correct / total) * 100);
  const timeSpent = Math.floor((Date.now() - startTime) / 1000);

  kursSubmissions[assignmentId + '_' + currentUsername] = {
    studentUsername: currentUsername, assignmentId,
    score, correct, wrong, empty, total, timeSpent,
    completedAt: new Date().toISOString()
  };
  saveKursData();

  const sc = score >= 70 ? 'var(--success)' : score >= 50 ? 'var(--accent2)' : 'var(--error)';
  const resultEl = document.getElementById('kurs-prac-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div style="background:var(--surface-alt); border:2px solid ${sc}; border-radius:12px; padding:20px; text-align:center;">
      <div style="font-size:3rem; font-weight:bold; color:${sc}; margin-bottom:10px;">%${score}</div>
      <div style="display:flex; gap:25px; justify-content:center; margin-bottom:15px;">
        <div><strong style="color:var(--success); font-size:1.5rem;">${correct}</strong><br><small>Doğru</small></div>
        <div><strong style="color:var(--error); font-size:1.5rem;">${wrong}</strong><br><small>Yanlış</small></div>
        <div><strong style="color:var(--text-dim); font-size:1.5rem;">${empty}</strong><br><small>Boş</small></div>
      </div>
      <p style="color:var(--text-dim); font-size:0.9rem; margin-bottom:15px;">
        Sonuçlarınız öğretmeninize iletildi. ✅
      </p>
      <button class="main-btn" onclick="returnToAssignments()">Ödevlerime Dön</button>
    </div>`;

  // Inputları kapat
  document.querySelectorAll('#kurs-prac-questions input, #kurs-prac-questions select').forEach(el => el.disabled = true);
  const submitBtn = document.getElementById('kurs-prac-submit-btn');
  if (submitBtn) submitBtn.style.display = 'none';
};

// ============================================================
// ÖĞRENCİ — SINAV MODU
// ============================================================
function _startKursExam(asgn) {
  const questions = GLOBAL_SORU_BANKASI.filter(
    q => q.exam === asgn.contentId && q.category === asgn.examCategory
  );
  if (questions.length === 0) { showToastMessage('❌ Bu sınava ait soru bulunamadı.'); return; }

  kursExamSession = {
    questions,
    currentIndex: 0,
    answers: {},
    startTime: Date.now(),
    assignmentId: asgn.id
  };

  _showKursWorkspace();
  _renderKursExamQuestion();
}

function _renderKursExamQuestion() {
  const { questions, currentIndex, answers } = kursExamSession;
  const q  = questions[currentIndex];
  const ws = document.getElementById('kurs-task-workspace');

  const optHtml = Object.entries(q.options).map(([key, val]) => {
    const sel = answers[q.id] === key;
    return `<div onclick="selectKursAnswer('${q.id}','${key}')"
      style="padding:14px 18px; border:2px solid ${sel ? 'var(--accent)' : 'var(--border)'};
             border-radius:8px; cursor:pointer; margin-bottom:8px;
             background:${sel ? 'rgba(79,142,247,0.12)' : 'var(--surface-alt)'};
             display:flex; align-items:flex-start; gap:12px; transition:all 0.15s;">
      <strong style="color:${sel ? 'var(--accent)' : 'var(--text-dim)'}; min-width:18px;">${key}</strong>
      <span>${val}</span>
    </div>`;
  }).join('');

  const paletHtml = questions.map((q2, i) => {
    const answered = answers[q2.id];
    const isCurrent = i === currentIndex;
    const bg    = isCurrent ? 'var(--accent)' : answered ? 'var(--success)' : 'var(--surface-alt)';
    const color = (isCurrent || answered) ? 'white' : 'var(--text)';
    return `<button onclick="kursExamGoTo(${i})"
      style="width:34px; height:34px; border:1px solid var(--border); border-radius:6px;
             background:${bg}; color:${color}; cursor:pointer; font-size:0.82rem;">${i + 1}</button>`;
  }).join('');

  const isLast = currentIndex === questions.length - 1;

  ws.innerHTML = `
    <div style="max-width:820px; margin:0 auto;">
      <div class="player-header" style="margin-bottom:20px;">
        <button class="secondary-btn"
          onclick="if(confirm('Sınavdan çıkmak istediğinize emin misiniz?')) cancelKursTask()">🔙 Çık</button>
        <h4 class="active-video-title">${kursExamSession.questions[0].category}</h4>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="color:var(--text-dim);">Soru <strong>${currentIndex + 1}</strong> / ${questions.length}</span>
        <span style="color:var(--accent2); font-size:0.9rem;">
          Cevaplanan: ${Object.keys(answers).length} / ${questions.length}
        </span>
      </div>

      <div style="background:var(--surface-alt); border-radius:10px; padding:20px; margin-bottom:20px;
          font-size:1.05rem; line-height:1.75; border:1px solid var(--border);">
        ${q.description ? `<p style="color:var(--text-dim); font-size:0.85rem; margin-bottom:8px;">${q.description}</p>` : ''}
        ${q.question}
      </div>

      <div>${optHtml}</div>

      <div style="display:flex; gap:10px; margin-top:20px;">
        <button class="secondary-btn" style="flex:1; padding:13px;" onclick="kursExamNav(-1)"
          ${currentIndex === 0 ? 'disabled' : ''}>← Önceki</button>
        ${isLast
          ? `<button class="main-btn" style="flex:1; padding:13px; background:var(--success);"
               onclick="finishKursExam()">✅ Sınavı Bitir</button>`
          : `<button class="main-btn" style="flex:1; padding:13px;"
               onclick="kursExamNav(1)">Sonraki →</button>`
        }
      </div>

      <div style="margin-top:20px; padding-top:15px; border-top:1px solid var(--border);">
        <p style="color:var(--text-dim); font-size:0.82rem; margin-bottom:8px;">Soru paleti:</p>
        <div style="display:flex; flex-wrap:wrap; gap:5px;">${paletHtml}</div>
      </div>
    </div>`;
}

window.selectKursAnswer = function (qId, key) {
  kursExamSession.answers[qId] = key;
  _renderKursExamQuestion();
};

window.kursExamNav = function (dir) {
  kursExamSession.currentIndex += dir;
  _renderKursExamQuestion();
};

window.kursExamGoTo = function (idx) {
  kursExamSession.currentIndex = idx;
  _renderKursExamQuestion();
};

window.finishKursExam = function () {
  const { questions, answers, startTime, assignmentId } = kursExamSession;
  const unanswered = questions.filter(q => !answers[q.id]).length;
  if (unanswered > 0 && !confirm(`${unanswered} soru boş bırakıldı. Yine de bitirmek istiyor musunuz?`)) return;

  let correct = 0, wrong = 0, empty = 0;
  questions.forEach(q => {
    const a = answers[q.id];
    if (!a) empty++;
    else if (a === q.answer) correct++;
    else wrong++;
  });

  const total     = questions.length;
  const score     = Math.round((correct / total) * 100);
  const timeSpent = Math.floor((Date.now() - startTime) / 1000);

  kursSubmissions[assignmentId + '_' + currentUsername] = {
    studentUsername: currentUsername, assignmentId,
    score, correct, wrong, empty, total, timeSpent,
    completedAt: new Date().toISOString()
  };
  saveKursData();

  const sc = score >= 70 ? 'var(--success)' : score >= 50 ? 'var(--accent2)' : 'var(--error)';
  const ws = document.getElementById('kurs-task-workspace');
  ws.innerHTML = `
    <div style="max-width:600px; margin:0 auto; text-align:center; padding:50px 20px;">
      <div style="font-size:4rem; margin-bottom:10px;">🎯</div>
      <h2 style="color:${sc}; font-size:2.8rem; margin-bottom:20px;">%${score}</h2>
      <div style="display:flex; gap:20px; justify-content:center; background:var(--surface-alt);
          padding:20px; border-radius:12px; margin-bottom:25px; border:1px solid var(--border);">
        <div><div style="font-size:2rem; font-weight:bold; color:var(--success);">${correct}</div><small>Doğru</small></div>
        <div><div style="font-size:2rem; font-weight:bold; color:var(--error);">${wrong}</div><small>Yanlış</small></div>
        <div><div style="font-size:2rem; font-weight:bold; color:var(--text-dim);">${empty}</div><small>Boş</small></div>
        <div><div style="font-size:2rem; font-weight:bold; color:var(--accent2);">${formatExamTime(timeSpent)}</div><small>Süre</small></div>
      </div>
      <p style="color:var(--text-dim); margin-bottom:25px;">Sonuçlarınız öğretmeninize iletildi. ✅</p>
      <button class="main-btn" style="padding:15px 35px; font-size:1.1rem;" onclick="returnToAssignments()">
        Ödevlerime Dön
      </button>
    </div>`;
};

// ============================================================
// ORTAK
// ============================================================
window.cancelKursTask = function () {
  kursActiveSession = null;
  kursExamSession   = null;
  returnToAssignments();
};

window.returnToAssignments = function () {
  kursActiveSession = null;
  kursExamSession   = null;
  renderStudentAssignments();
};
