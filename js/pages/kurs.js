/* ============================================================
 * KURS PANELİ — Öğretmen & Öğrenci Yönetim Sistemi
 * ============================================================ */

// --- VERİ ---
let kursClasses     = JSON.parse(localStorage.getItem('y_kurs_classes'))      || [];
let kursAssignments = JSON.parse(localStorage.getItem('y_kurs_assignments'))  || [];
let kursSubmissions = JSON.parse(localStorage.getItem('y_kurs_submissions'))  || {};
let kursThreads     = JSON.parse(localStorage.getItem('y_kurs_threads'))        || {};

// Aktif oturum (öğrenci ödev çözerken)
let kursActiveSession = null;
let kursExamSession   = null;

function saveKursData() {
  localStorage.setItem('y_kurs_classes',      JSON.stringify(kursClasses));
  localStorage.setItem('y_kurs_assignments',  JSON.stringify(kursAssignments));
  localStorage.setItem('y_kurs_submissions',  JSON.stringify(kursSubmissions));
  localStorage.setItem('y_kurs_threads',      JSON.stringify(kursThreads));

  if (window.useFirebase && window.db) {
    window.db.collection("global").doc("kurs_data").set({
      classes: kursClasses,
      assignments: kursAssignments,
      submissions: kursSubmissions,
      threads: kursThreads
    }, { merge: true }).catch(e => console.error("Kurs veri kaydetme hatası:", e));
  }
}

window.updateKursDataFromCloud = function(cloudData) {
  if (cloudData.classes) {
      kursClasses.length = 0; 
      cloudData.classes.forEach(c => kursClasses.push(c));
  }
  if (cloudData.assignments) {
      kursAssignments.length = 0;
      cloudData.assignments.forEach(a => kursAssignments.push(a));
  }
  if (cloudData.submissions) {
      for (let prop in kursSubmissions) { delete kursSubmissions[prop]; }
      Object.assign(kursSubmissions, cloudData.submissions);
  }
  if (cloudData.threads) {
      for (let prop in kursThreads) { delete kursThreads[prop]; }
      Object.assign(kursThreads, cloudData.threads);
  }

  localStorage.setItem('y_kurs_classes', JSON.stringify(kursClasses));
  localStorage.setItem('y_kurs_assignments', JSON.stringify(kursAssignments));
  localStorage.setItem('y_kurs_submissions', JSON.stringify(kursSubmissions));
  localStorage.setItem('y_kurs_threads', JSON.stringify(kursThreads));
  
  // Eğer kullanıcı o an Kurs sekmesindeyse ekranı yenile
  const kursSection = document.getElementById('section-kurs');
  if (kursSection && kursSection.style.display === 'block') {
      window.renderKursPanel();
  }
  if (typeof window.checkNewKursAssignmentToasts === 'function') {
    window.checkNewKursAssignmentToasts();
  }
  if (typeof window.refreshKursMessagingIfVisible === 'function') {
    window.refreshKursMessagingIfVisible();
  }
};

/** Bulut güncellemesinde açık mesaj thread'lerini yenile (öğretmen/öğrenci) */
window.refreshKursMessagingIfVisible = function () {
  const sec = document.getElementById('section-kurs');
  if (!sec || sec.style.display !== 'block' || typeof currentUser === 'undefined' || !currentUser) return;
  if (kursIsTeacher()) {
    const mp = document.getElementById('kurs-panel-messages');
    if (mp && mp.style.display === 'block' && typeof window.renderTeacherMessageThread === 'function') {
      window.renderTeacherMessageThread();
    }
  } else {
    if (typeof window.renderStudentMessageThread === 'function') {
      window.renderStudentMessageThread();
    }
  }
};

// --- YETKİ ---
function kursIsTeacher() {
  return currentUser && (currentUser.role === 'teacher' || currentUser.role === 'admin');
}

function kursEscapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kursThreadKey(teacherUsername, studentUsername) {
  return teacherUsername + '|||' + studentUsername;
}

function kursEnsureThread(teacherUsername, studentUsername) {
  const key = kursThreadKey(teacherUsername, studentUsername);
  if (!kursThreads[key]) {
    kursThreads[key] = {
      teacherUsername,
      studentUsername,
      messages: []
    };
  }
  return key;
}

function kursTeacherHasStudent(teacherUsername, studentUsername) {
  if (kursClasses.some(
    c => c.teacherUsername === teacherUsername && c.studentUsernames.includes(studentUsername)
  )) return true;
  return kursAssignments.some(
    a => a.teacherUsername === teacherUsername &&
      a.studentUsernames && a.studentUsernames.includes(studentUsername)
  );
}
window.kursTeacherHasStudent = kursTeacherHasStudent;

function kursStudentTeacherList() {
  const fromAssign = kursAssignments
    .filter(a => a.studentUsernames.includes(currentUsername))
    .map(a => a.teacherUsername);
  const fromClasses = kursClasses
    .filter(c => c.studentUsernames.includes(currentUsername))
    .map(c => c.teacherUsername);
  return [...new Set([...fromAssign, ...fromClasses])];
}

/**
 * Öğretmen panelinde sınıfa / ödeve yalnızca «öğrenci» rolü eklenebilir ve listelenir.
 */
function kursIsStudentMemberRole(username) {
  const u = typeof dbUsers !== "undefined" ? dbUsers[username] : null;
  if (!u || typeof u !== "object") return false;
  return u.role === "student";
}

function kursTeacherStudentList() {
  const myClasses = kursClasses.filter(c => c.teacherUsername === currentUsername);
  const fromClasses = myClasses.flatMap(c => c.studentUsernames);
  const fromAssign = kursAssignments
    .filter(a => a.teacherUsername === currentUsername)
    .flatMap(a => a.studentUsernames || []);
  const merged = [...new Set([...fromClasses, ...fromAssign])];
  return merged.filter(u => kursIsStudentMemberRole(u));
}

function kursDisplayUserLabel(username) {
  if (!username) return '';
  const u = typeof dbUsers !== 'undefined' ? dbUsers[username] : null;
  const name = u && (u.displayName || u.fullName);
  if (name && String(name).trim()) {
    return `${kursEscapeHtml(String(name).trim())} <span style="color:var(--text-dim); font-weight:normal; font-size:0.88rem;">(${kursEscapeHtml(username)})</span>`;
  }
  return kursEscapeHtml(username);
}

function kursFormatStudentOptionLabel(username) {
  if (!username) return '';
  const u = typeof dbUsers !== 'undefined' ? dbUsers[username] : null;
  const nm = u && (u.displayName || u.fullName);
  if (nm && String(nm).trim()) return `${String(nm).trim()} (${username})`;
  return username;
}

/** Bildirim metinleri için kısa ad (ad soyad öncelikli) */
window.kursPlainDisplayName = function (username) {
  if (!username) return '';
  const u = typeof dbUsers !== 'undefined' ? dbUsers[username] : null;
  const nm = u && (u.displayName || u.fullName);
  if (nm && String(nm).trim()) return String(nm).trim();
  return username;
};

/**
 * Özel alıştırma: yalnız öğretmen + bu içeriği ödev olarak atanmış öğrenci görür
 * (sınıfta olup atanmamış öğrenci görmez).
 */
window.kursStudentMaySeeTeacherPrivatePractice = function (
  teacherUsername,
  studentUsername,
  practiceId,
) {
  if (!teacherUsername || !studentUsername || !practiceId) return false;
  if (!Array.isArray(kursAssignments)) return false;
  return kursAssignments.some(function (a) {
    if (!a || a.teacherUsername !== teacherUsername) return false;
    if (!Array.isArray(a.studentUsernames)) return false;
    if (a.studentUsernames.indexOf(studentUsername) === -1) return false;
    if (a.type !== 'practice') return false;
    if (a.contentId === practiceId) return true;
    if (
      a.practicePayload &&
      (a.practicePayload.id === practiceId || a.contentId === practiceId)
    ) {
      return true;
    }
    return false;
  });
};

window.getTeacherPrivatePractices = function () {
  if (!currentUsername || typeof dbUserData === 'undefined' || !dbUserData[currentUsername]) return [];
  return dbUserData[currentUsername].teacherPrivatePractices || [];
};

function getTeacherPrivatePracticesByUsername(username) {
  if (!username || typeof dbUserData === 'undefined' || !dbUserData[username]) return [];
  const arr = dbUserData[username].teacherPrivatePractices;
  return Array.isArray(arr) ? arr : [];
}

function buildPracticeSelectValue(source, id) {
  return source + ':' + encodeURIComponent(String(id));
}

function parsePracticeSelectValue(value) {
  if (!value) return { source: 'legacy', contentId: '' };
  const splitAt = value.indexOf(':');
  if (splitAt < 0) return { source: 'legacy', contentId: value };
  const source = value.slice(0, splitAt);
  const rawId = value.slice(splitAt + 1);
  if (!source || !rawId) return { source: 'legacy', contentId: value };
  try {
    return { source, contentId: decodeURIComponent(rawId) };
  } catch (e) {
    return { source, contentId: rawId };
  }
}

function findPracticeContentBySource(contentId, source, teacherUsername) {
  if (!contentId) return null;
  if (source === 'private') {
    const owner = teacherUsername || currentUsername;
    const privByTeacher = getTeacherPrivatePracticesByUsername(owner);
    return privByTeacher.find(p => p && p.id === contentId) || null;
  }
  if (source === 'catalog') {
    return PRACTICE_CATALOG.find(p => p.id === contentId) || null;
  }
  if (source === 'teacher_public') {
    return (window.TEACHER_PUBLIC_PRACTICES_LIST || []).find(p => p && p.id === contentId) || null;
  }
  return findPracticeContentById(contentId);
}

function findPracticeContentById(contentId) {
  const pub = PRACTICE_CATALOG.find(p => p.id === contentId);
  if (pub) return pub;
  const tpub = (window.TEACHER_PUBLIC_PRACTICES_LIST || []).find(p => p.id === contentId);
  if (tpub) return tpub;
  const priv = window.getTeacherPrivatePractices();
  return Array.isArray(priv) ? priv.find(p => p.id === contentId) : null;
}

/** Öğrenci ödev ekranı: öğretmenin özel içeriği ödev kaydında gömülü olabilir */
function getPracticeForKursTask(asgn) {
  if (!asgn) return null;
  if (asgn.practicePayload && Array.isArray(asgn.practicePayload.questions)) {
    return asgn.practicePayload;
  }
  const source = asgn.contentSource || 'legacy';
  const fromSource = findPracticeContentBySource(asgn.contentId, source, asgn.teacherUsername);
  if (fromSource) return fromSource;

  // Eski kayıtlar için: yanlış ID eşleşse bile öğretmenin özel listesinde başlığa göre kurtarmayı dene.
  if (asgn.teacherUsername && asgn.contentTitle) {
    const teacherPriv = getTeacherPrivatePracticesByUsername(asgn.teacherUsername);
    const byTitle = teacherPriv.find(p => p && p.title === asgn.contentTitle);
    if (byTitle) return byTitle;
  }
  return findPracticeContentById(asgn.contentId);
}

/** Yeni ödev bildirimi (öğrenci, uygulama içi) */
window.checkNewKursAssignmentToasts = function () {
  if (!currentUsername || kursIsTeacher()) return;
  try {
    const mine = kursAssignments.filter(a =>
      a.studentUsernames && a.studentUsernames.includes(currentUsername));
    const seen = JSON.parse(localStorage.getItem('y_kurs_seen_assign_ids') || '[]');
    const seenSet = new Set(seen);
    if (!localStorage.getItem('y_kurs_notify_init')) {
      mine.forEach(a => seenSet.add(a.id));
      localStorage.setItem('y_kurs_seen_assign_ids', JSON.stringify([...seenSet]));
      localStorage.setItem('y_kurs_notify_init', '1');
      return;
    }
    mine.forEach(a => {
      if (!seenSet.has(a.id)) {
        seenSet.add(a.id);
        if (typeof showToastMessage === 'function') {
          showToastMessage('📋 Yeni ödev: ' + (a.contentTitle || 'Ödev'));
        }
      }
    });
    localStorage.setItem('y_kurs_seen_assign_ids', JSON.stringify([...seenSet]));
  } catch (e) { /* ignore */ }
};

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
    if (!document.querySelector('#kurs-teacher-tabs .sub-tab-btn.active')) {
      const first = document.querySelector('#kurs-teacher-tabs .sub-tab-btn');
      if (first) first.classList.add('active');
    }
  } else {
    teacherView.style.display = 'none';
    studentView.style.display = 'block';
    renderStudentAssignments();
    if (typeof window.renderStudentKursMessaging === 'function') window.renderStudentKursMessaging();
    if (typeof window.checkNewKursAssignmentToasts === 'function') window.checkNewKursAssignmentToasts();
  }
};

// ============================================================
// ÖĞRETMEN — SEKME
// ============================================================
window.switchKursTab = function (tab, btn) {
  ['classes', 'assign', 'reports', 'messages', 'teacher-mats'].forEach(t => {
    const el = document.getElementById('kurs-panel-' + t);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('#kurs-teacher-tabs .sub-tab-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('kurs-panel-' + tab);
  if (panel) panel.style.display = 'block';
  if (btn)   btn.classList.add('active');

  if (tab === 'assign')  renderAssignForm();
  if (tab === 'reports') renderTeacherReports();
  if (tab === 'messages') window.renderTeacherMessages && window.renderTeacherMessages();
  if (tab === 'teacher-mats') {
    if (typeof window.openKursContentStudio === 'function') {
      window.openKursContentStudio();
    }
    if (typeof window.renderTeacherPrivateMaterials === 'function') {
      window.renderTeacherPrivateMaterials();
    }
  }
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
          const label = typeof kursFormatStudentOptionLabel === 'function' ? kursFormatStudentOptionLabel(uname) : uname;
          return `<div style="display:flex; justify-content:space-between; align-items:center;
                      padding:10px 0; border-bottom:1px solid var(--border);">
            <span>${badge} <strong>${kursEscapeHtml(label)}</strong></span>
            <button onclick="removeStudentFromClass('${cls.id}', ${JSON.stringify(uname)})"
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
    kursIsStudentMemberRole(u)
  );

  document.getElementById('kurs-add-student-classid').value = classId;
  document.getElementById('kurs-student-select').innerHTML = available.length > 0
    ? available.map(u => {
        const st = dbUsers[u] && dbUsers[u].status === 'approved' ? 'Onaylı' : 'Beklemede';
        const lab = typeof kursFormatStudentOptionLabel === 'function' ? kursFormatStudentOptionLabel(u) : u;
        return `<option value=${JSON.stringify(u)}>${kursEscapeHtml(lab)} (${st})</option>`;
      }).join('')
    : '<option value="">-- Öğrenci rolünde üye yok (Yönetim → Kullanıcılar: rolü «Öğrenci» yapın) --</option>';

  document.getElementById('kurs-add-student-modal').style.display = 'flex';
};

window.closeAddStudentModal = function () {
  document.getElementById('kurs-add-student-modal').style.display = 'none';
};

window.addStudentToClass = function () {
  const classId  = document.getElementById('kurs-add-student-classid').value;
  const username = document.getElementById('kurs-student-select').value;
  if (!username) { showToastMessage('❌ Lütfen bir kullanıcı seçin.'); return; }
  if (!kursIsStudentMemberRole(username)) {
    showToastMessage('❌ Yalnızca «Öğrenci» rolündeki üyeler sınıfa eklenebilir.');
    return;
  }

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
window.onAssignTargetModeChange = function () {
  const mode =
    (document.querySelector('input[name="assign-target-mode"]:checked') || {}).value ||
    'class';
  const blockClass = document.getElementById('assign-block-class');
  const blockPick = document.getElementById('assign-block-students');
  if (blockClass) blockClass.style.display = mode === 'class' ? 'block' : 'none';
  if (blockPick) blockPick.style.display = mode === 'pick' ? 'block' : 'none';
};

window.assignStudentPickAll = function () {
  document
    .querySelectorAll('#assign-student-checkboxes input[type="checkbox"][data-username]')
    .forEach((cb) => {
      cb.checked = true;
    });
};

window.assignStudentPickNone = function () {
  document
    .querySelectorAll('#assign-student-checkboxes input[type="checkbox"][data-username]')
    .forEach((cb) => {
      cb.checked = false;
    });
};

window.assignClassSubsetPickAll = function () {
  document
    .querySelectorAll('#assign-class-student-subset input.assign-class-subset-cb[data-username]')
    .forEach((cb) => {
      cb.checked = true;
    });
};

window.assignClassSubsetPickNone = function () {
  document
    .querySelectorAll('#assign-class-student-subset input.assign-class-subset-cb[data-username]')
    .forEach((cb) => {
      cb.checked = false;
    });
};

/** «Tüm sınıfa» modunda seçilen sınıf için isteğe bağlı alt küme (ör. yalnız 2 öğrenci). */
window.renderAssignClassSubset = function () {
  const wrap = document.getElementById('assign-class-subset-wrap');
  const box = document.getElementById('assign-class-student-subset');
  const classSel = document.getElementById('assign-class-select');
  if (!wrap || !box) return;
  const classIdRaw = classSel && classSel.value;
  if (!classIdRaw) {
    wrap.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  const cls = kursClasses.find((c) => c.id === classIdRaw);
  const students = cls
    ? cls.studentUsernames.filter((u) => kursIsStudentMemberRole(u)).slice()
    : [];
  students.sort((a, b) => {
    const la =
      typeof kursFormatStudentOptionLabel === 'function'
        ? kursFormatStudentOptionLabel(a)
        : a;
    const lb =
      typeof kursFormatStudentOptionLabel === 'function'
        ? kursFormatStudentOptionLabel(b)
        : b;
    return String(la).localeCompare(String(lb), 'tr');
  });
  if (students.length === 0) {
    wrap.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  wrap.style.display = 'block';
  box.innerHTML = students
    .map((u) => {
      const lab =
        typeof kursFormatStudentOptionLabel === 'function'
          ? kursFormatStudentOptionLabel(u)
          : u;
      const enc = encodeURIComponent(u);
      return (
        `<label style="display:flex;align-items:center;gap:10px;padding:6px 4px;cursor:pointer;border-radius:6px;">` +
        `<input type="checkbox" class="assign-class-subset-cb" data-username="${enc}">` +
        `<span>${kursEscapeHtml(lab)}</span></label>`
      );
    })
    .join('');
};

window.renderAssignForm = function () {
  const myClasses = kursClasses.filter(
    (c) => c.teacherUsername === currentUsername,
  );
  const classSel = document.getElementById('assign-class-select');
  const box = document.getElementById('assign-student-checkboxes');

  let classHtml = '<option value="">-- Sınıf seçin --</option>';
  myClasses.forEach((cls) => {
    const n = cls.studentUsernames.filter((u) => kursIsStudentMemberRole(u)).length;
    classHtml += `<option value="${kursEscapeHtml(cls.id)}">🏫 ${kursEscapeHtml(cls.name)} (${n} öğrenci)</option>`;
  });
  if (classSel) {
    classSel.innerHTML = classHtml;
    classSel.onchange = function () {
      if (typeof window.renderAssignClassSubset === 'function') {
        window.renderAssignClassSubset();
      }
    };
  }

  const allStudents = [
    ...new Set(myClasses.flatMap((c) => c.studentUsernames)),
  ]
    .filter((u) => kursIsStudentMemberRole(u))
    .sort((a, b) => {
      const la =
        typeof kursFormatStudentOptionLabel === 'function'
          ? kursFormatStudentOptionLabel(a)
          : a;
      const lb =
        typeof kursFormatStudentOptionLabel === 'function'
          ? kursFormatStudentOptionLabel(b)
          : b;
      return String(la).localeCompare(String(lb), 'tr');
    });

  if (box) {
    if (allStudents.length === 0) {
      box.innerHTML =
        '<p style="color:var(--text-dim); font-size:0.9rem; margin:0;">Sınıflarınıza «Öğrenci» rolünde üye ekleyin; liste burada görünür.</p>';
    } else {
      box.innerHTML = allStudents
        .map((u) => {
          const lab =
            typeof kursFormatStudentOptionLabel === 'function'
              ? kursFormatStudentOptionLabel(u)
              : u;
          const enc = encodeURIComponent(u);
          return (
            `<label style="display:flex;align-items:center;gap:10px;padding:6px 4px;cursor:pointer;border-radius:6px;">` +
            `<input type="checkbox" data-username="${enc}">` +
            `<span>${kursEscapeHtml(lab)}</span></label>`
          );
        })
        .join('');
    }
  }

  if (typeof window.renderAssignClassSubset === 'function') {
    window.renderAssignClassSubset();
  }
  if (typeof window.onAssignTargetModeChange === 'function') {
    window.onAssignTargetModeChange();
  }
  onAssignTypeChange();
};

window.onAssignTypeChange = function () {
  const type         = document.getElementById('assign-type-select').value;
  const contentSel   = document.getElementById('assign-content-select');
  const examCatGroup = document.getElementById('assign-exam-cat-group');

  if (type === 'practice') {
    examCatGroup.style.display = 'none';
    const priv = (typeof window.getTeacherPrivatePractices === 'function' && window.getTeacherPrivatePractices()) || [];
    let inner = '<option value="">-- Alıştırma Seçin --</option>';
    if (priv.length > 0) {
      inner += '<optgroup label="📁 Özel içeriklerim">';
      inner += priv.map(p =>
        `<option value="${buildPracticeSelectValue('private', p.id)}">📁 ${kursEscapeHtml(p.title)} (${kursEscapeHtml(p.level || '—')})</option>`
      ).join('');
      inner += '</optgroup>';
    }
    inner += '<optgroup label="🌐 Genel katalog">';
    const seenPub = new Set();
    PRACTICE_CATALOG.forEach(p => {
      seenPub.add(p.id);
      inner += `<option value="${buildPracticeSelectValue('catalog', p.id)}">${kursEscapeHtml(p.title)} (${kursEscapeHtml(p.level)})</option>`;
    });
    (window.TEACHER_PUBLIC_PRACTICES_LIST || []).forEach(p => {
      if (!p || !p.id || seenPub.has(p.id)) return;
      seenPub.add(p.id);
      inner += `<option value="${buildPracticeSelectValue('teacher_public', p.id)}">🌐 ${kursEscapeHtml(p.title)} (${kursEscapeHtml(p.level || '—')})</option>`;
    });
    inner += '</optgroup>';
    contentSel.innerHTML = inner;
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
  const mode =
    (document.querySelector('input[name="assign-target-mode"]:checked') || {}).value ||
    'class';
  const type      = document.getElementById('assign-type-select').value;
  const selectedContentValue = document.getElementById('assign-content-select').value;
  let contentId = selectedContentValue;
  const dueDate   = document.getElementById('assign-due-date').value;
  const teacherMsgEl = document.getElementById('assign-teacher-message');
  const teacherMessage = teacherMsgEl && teacherMsgEl.value ? teacherMsgEl.value.trim() : '';

  if (!selectedContentValue) { showToastMessage('❌ İçerik seçin.'); return; }

  let studentUsernames = [], classId = null;

  if (mode === 'class') {
    const classIdRaw = document.getElementById('assign-class-select') &&
      document.getElementById('assign-class-select').value;
    if (!classIdRaw) {
      showToastMessage('❌ Sınıf seçin.');
      return;
    }
    classId = classIdRaw;
    const cls = kursClasses.find((c) => c.id === classId);
    if (!cls || cls.studentUsernames.length === 0) {
      showToastMessage('❌ Sınıfta kayıtlı kimse yok.');
      return;
    }

    const subsetPicked = [];
    document
      .querySelectorAll(
        '#assign-class-student-subset input.assign-class-subset-cb[data-username]:checked',
      )
      .forEach((cb) => {
        const enc = cb.getAttribute('data-username');
        if (!enc) return;
        try {
          subsetPicked.push(decodeURIComponent(enc));
        } catch (e) { /* ignore */ }
      });

    if (subsetPicked.length > 0) {
      studentUsernames = [...new Set(subsetPicked)].filter((u) => kursIsStudentMemberRole(u));
      if (studentUsernames.length === 0) {
        showToastMessage(
          '❌ Seçilen kullanıcılar «Öğrenci» rolünde değil.',
        );
        return;
      }
    } else {
      studentUsernames = cls.studentUsernames.filter((u) => kursIsStudentMemberRole(u));
      if (studentUsernames.length === 0) {
        showToastMessage(
          '❌ Sınıfta «Öğrenci» rolünde kimse yok. Yönetici rol ataması yapmalı.',
        );
        return;
      }
    }
  } else {
    const picked = [];
    document
      .querySelectorAll(
        '#assign-student-checkboxes input[type="checkbox"][data-username]:checked',
      )
      .forEach((cb) => {
        const enc = cb.getAttribute('data-username');
        if (!enc) return;
        try {
          picked.push(decodeURIComponent(enc));
        } catch (e) { /* ignore */ }
      });
    studentUsernames = [...new Set(picked)].filter((u) => kursIsStudentMemberRole(u));
    if (studentUsernames.length === 0) {
      showToastMessage('❌ En az bir öğrenci işaretleyin.');
      return;
    }
    classId = null;
  }

  let contentTitle = '', examCategory = null, contentSource = null;
  let practicePayload = null;

  if (type === 'practice') {
    const parsed = parsePracticeSelectValue(selectedContentValue);
    contentId = parsed.contentId;
    contentSource = parsed.source;
    if (!contentId) { showToastMessage('❌ Alıştırma seçimi geçersiz.'); return; }

    const prac = findPracticeContentBySource(contentId, contentSource, currentUsername) ||
      findPracticeContentById(contentId);
    contentTitle = prac ? prac.title : contentId;
    if (prac) {
      if (contentSource === 'private') {
        try { practicePayload = JSON.parse(JSON.stringify(prac)); } catch (e) { /* ignore */ }
      }
    }
  } else {
    contentSource = 'exam';
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
    contentSource,
    contentTitle,
    examCategory,
    dueDate: dueDate || null,
    teacherMessage: teacherMessage || null,
    practicePayload: practicePayload || null,
    createdAt: new Date().toISOString()
  });

  saveKursData();
  const tLab = typeof window.kursPlainDisplayName === 'function'
    ? window.kursPlainDisplayName(currentUsername)
    : currentUsername;
  if (typeof window.pushUserAnnouncement === 'function') {
    studentUsernames.forEach(function (stu) {
      window.pushUserAnnouncement(
        stu,
        `📋 Yeni ödev: «${contentTitle || 'Ödev'}». Öğretmen: ${tLab}. Kurs sekmesinden açabilirsiniz.`,
        'kurs',
      );
    });
  }
  showToastMessage(`✅ Ödev atandı → ${studentUsernames.length} öğrenci`);

  // Formu sıfırla
  const classSelEl = document.getElementById('assign-class-select');
  if (classSelEl) classSelEl.value = '';
  if (typeof window.renderAssignClassSubset === 'function') {
    window.renderAssignClassSubset();
  }
  document.getElementById('assign-content-select').value = '';
  document.getElementById('assign-due-date').value       = '';
  if (teacherMsgEl) teacherMsgEl.value = '';
  if (typeof window.assignStudentPickNone === 'function') {
    window.assignStudentPickNone();
  }
  if (typeof window.assignClassSubsetPickNone === 'function') {
    window.assignClassSubsetPickNone();
  }
  if (typeof window.onAssignTargetModeChange === 'function') {
    window.onAssignTargetModeChange();
  }
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
          <td style="padding:10px 12px; border-bottom:1px solid var(--border);">${typeof kursDisplayUserLabel === 'function' ? kursDisplayUserLabel(uname) : kursEscapeHtml(uname)}</td>
          <td style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">${badge}</td>
          <td colspan="6" style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border); color:var(--text-dim);">—</td>
        </tr>`;
      }

      const sc = sub.score >= 70 ? 'var(--success)' : sub.score >= 50 ? 'var(--accent2)' : 'var(--error)';
      const notePrev = sub.teacherNote
        ? (sub.teacherNote.length > 48 ? kursEscapeHtml(sub.teacherNote.slice(0, 48)) + '…' : kursEscapeHtml(sub.teacherNote))
        : '<span style="color:var(--text-dim);">—</span>';
      const gradeCell = sub.teacherGrade != null && sub.teacherGrade !== ''
        ? `<span style="color:var(--accent2); font-weight:bold;">${kursEscapeHtml(String(sub.teacherGrade))}</span> · `
        : '';
      return `<tr>
        <td style="padding:10px 12px; border-bottom:1px solid var(--border);">${typeof kursDisplayUserLabel === 'function' ? kursDisplayUserLabel(uname) : kursEscapeHtml(uname)}</td>
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
        <td style="padding:10px 12px; border-bottom:1px solid var(--border); font-size:0.82rem; max-width:160px;">
          ${gradeCell}${notePrev}
        </td>
        <td style="padding:10px 8px; text-align:center; border-bottom:1px solid var(--border); white-space:nowrap;">
          <button type="button" class="secondary-btn kurs-rpt-detail-btn" style="padding:6px 10px; font-size:0.8rem; margin:2px;"
            data-kurs-aid="${encodeURIComponent(asgn.id)}" data-kurs-stu="${encodeURIComponent(uname)}">Cevaplar</button>
          <button type="button" class="secondary-btn kurs-rpt-note-btn" style="padding:6px 10px; font-size:0.8rem; margin:2px;"
            data-kurs-aid="${encodeURIComponent(asgn.id)}" data-kurs-stu="${encodeURIComponent(uname)}">Not</button>
        </td>
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
                <th style="padding:10px 12px; text-align:left; border-bottom:1px solid var(--border);">Not / puan</th>
                <th style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">İşlem</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.kurs-rpt-detail-btn').forEach(function (btn) {
    btn.onclick = function (e) {
      e.stopPropagation();
      const aid = decodeURIComponent(btn.getAttribute('data-kurs-aid') || '');
      const stu = decodeURIComponent(btn.getAttribute('data-kurs-stu') || '');
      window.kursOpenSubmissionDetail(aid, stu);
    };
  });
  container.querySelectorAll('.kurs-rpt-note-btn').forEach(function (btn) {
    btn.onclick = function (e) {
      e.stopPropagation();
      const aid = decodeURIComponent(btn.getAttribute('data-kurs-aid') || '');
      const stu = decodeURIComponent(btn.getAttribute('data-kurs-stu') || '');
      window.kursOpenTeacherNoteModal(aid, stu);
    };
  });
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

window.kursOpenSubmissionDetail = function (assignmentId, studentUsername) {
  const asgn = kursAssignments.find(a => a.id === assignmentId);
  const sub = kursSubmissions[assignmentId + '_' + studentUsername];
  const modal = document.getElementById('kurs-detail-modal');
  const body = document.getElementById('kurs-detail-modal-body');
  if (!modal || !body || !sub) return;
  let html = '<p style="color:var(--text-dim); margin-bottom:12px;"><strong>Öğrenci:</strong> ' +
    (typeof kursDisplayUserLabel === 'function' ? kursDisplayUserLabel(studentUsername) : kursEscapeHtml(studentUsername)) + '</p>';
  if (asgn) {
    html += '<p style="margin-bottom:16px;"><strong>Ödev:</strong> ' + kursEscapeHtml(asgn.contentTitle) + '</p>';
  }
  const details = sub.answerDetails;
  if (!details || !details.length) {
    html += '<p style="color:var(--text-dim);">Bu teslimde soru bazlı kayıt yok (eski kayıt). Genel puan: %' + sub.score + '</p>';
  } else {
    html += '<div style="display:flex; flex-direction:column; gap:12px; max-height:60vh; overflow:auto;">';
    details.forEach((d, i) => {
      const mark = d.ok ? '✅' : '❌';
      const col = d.ok ? 'var(--success)' : 'var(--error)';
      html += `<div style="border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--surface-alt);">
        <div style="font-weight:bold; color:${col}; margin-bottom:6px;">${mark} Soru ${i + 1}</div>
        <div style="font-size:0.9rem; margin-bottom:8px; color:var(--text);">${kursEscapeHtml(d.prompt)}</div>
        <div style="font-size:0.85rem;"><span style="color:var(--text-dim);">Öğrenci:</span> ${kursEscapeHtml(d.userAnswer)}</div>
        <div style="font-size:0.85rem;"><span style="color:var(--text-dim);">Doğru cevap:</span> ${kursEscapeHtml(d.correctAnswer)}</div>
      </div>`;
    });
    html += '</div>';
  }
  body.innerHTML = html;
  modal.style.display = 'flex';
};

window.kursCloseDetailModal = function () {
  const modal = document.getElementById('kurs-detail-modal');
  if (modal) modal.style.display = 'none';
};

window.kursOpenTeacherNoteModal = function (assignmentId, studentUsername) {
  const sub = kursSubmissions[assignmentId + '_' + studentUsername];
  const modal = document.getElementById('kurs-note-modal');
  if (!modal || !sub) return;
  modal.dataset.assignmentId = assignmentId;
  modal.dataset.studentUsername = studentUsername;
  const ta = document.getElementById('kurs-teacher-note-input');
  const gr = document.getElementById('kurs-teacher-grade-input');
  if (ta) ta.value = sub.teacherNote || '';
  if (gr) gr.value = sub.teacherGrade != null && sub.teacherGrade !== '' ? String(sub.teacherGrade) : '';
  modal.style.display = 'flex';
};

window.kursCloseNoteModal = function () {
  const modal = document.getElementById('kurs-note-modal');
  if (modal) modal.style.display = 'none';
};

window.kursSaveTeacherNote = function () {
  const modal = document.getElementById('kurs-note-modal');
  const assignmentId = modal && modal.dataset.assignmentId;
  const studentUsername = modal && modal.dataset.studentUsername;
  if (!assignmentId || !studentUsername) return;
  const key = assignmentId + '_' + studentUsername;
  const sub = kursSubmissions[key];
  if (!sub) return;
  const ta = document.getElementById('kurs-teacher-note-input');
  const gr = document.getElementById('kurs-teacher-grade-input');
  sub.teacherNote = ta ? ta.value.trim() : '';
  const g = gr && gr.value.trim();
  if (g === '') delete sub.teacherGrade;
  else {
    const n = parseInt(g, 10);
    if (!isNaN(n)) sub.teacherGrade = Math.max(0, Math.min(100, n));
  }
  sub.teacherNoteAt = new Date().toISOString();
  sub.teacherNoteBy = currentUsername;
  saveKursData();
  if (modal) modal.style.display = 'none';
  showToastMessage('Not kaydedildi.');
  const asgnNote = kursAssignments.find(function (a) { return a.id === assignmentId; });
  if (typeof window.pushUserAnnouncement === 'function' && studentUsername) {
    const ttl = asgnNote ? asgnNote.contentTitle || 'Ödev' : 'Ödev';
    window.pushUserAnnouncement(
      studentUsername,
      `📝 Öğretmeniniz «${ttl}» ödeviniz için not veya puan güncelledi. Kurs bölümünden inceleyebilirsiniz.`,
      'kurs',
    );
  }
  renderTeacherReports();
};

// ============================================================
// ÖĞRETMEN / ÖĞRENCİ — MESAJLAŞMA
// ============================================================
window.renderTeacherMessages = function () {
  const sel = document.getElementById('kurs-msg-student-select');
  const hint = document.getElementById('kurs-msg-teacher-hint');
  if (!sel) return;
  const students = kursTeacherStudentList().sort();
  const taT = document.getElementById('kurs-msg-input-teacher');
  if (students.length === 0) {
    sel.innerHTML = '<option value="">— Öğrenci yok —</option>';
    sel.disabled = true;
    if (taT) { taT.disabled = true; taT.placeholder = 'Öğrenci ekleyin veya ödev atayın.'; }
    if (hint) {
      hint.style.display = 'block';
      hint.textContent = 'Sınıfa öğrenci ekleyin veya ödev vererek öğrenci seçin; sonra buradan yazışabilirsiniz.';
    }
    const box = document.getElementById('kurs-msg-thread');
    if (box) box.innerHTML = '<p style="color:var(--text-dim); font-size:0.9rem;">Henüz mesajlaşabileceğiniz öğrenci yok.</p>';
    return;
  }
  sel.disabled = false;
  if (taT) { taT.disabled = false; taT.placeholder = 'Mesajınız...'; }
  if (hint) hint.style.display = 'none';
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Öğrenci seçin —</option>' +
    students.map(s =>
      `<option value=${JSON.stringify(s)}>${kursEscapeHtml(typeof kursFormatStudentOptionLabel === 'function' ? kursFormatStudentOptionLabel(s) : s)}</option>`
    ).join('');
  if (prev && students.includes(prev)) sel.value = prev;
  window.renderTeacherMessageThread();
};

window.renderTeacherMessageThread = function () {
  const sel = document.getElementById('kurs-msg-student-select');
  const box = document.getElementById('kurs-msg-thread');
  if (!sel || !box) return;
  const student = sel.value;
  if (!student) {
    box.innerHTML = '<p style="color:var(--text-dim); font-size:0.9rem;">Soldan öğrenci seçin.</p>';
    return;
  }
  const key = kursThreadKey(currentUsername, student);
  const thread = kursThreads[key];
  const messages = (thread && thread.messages) || [];
  if (messages.length === 0) {
    box.innerHTML = '<p style="color:var(--text-dim); font-size:0.9rem;">Henüz mesaj yok. Aşağıdan yazabilirsiniz.</p>';
    return;
  }
  box.innerHTML = messages.map(m => {
    const mine = m.from === currentUsername;
    return `<div style="margin-bottom:10px; text-align:${mine ? 'right' : 'left'};">
      <div style="display:inline-block; max-width:85%; padding:10px 14px; border-radius:12px;
        background:${mine ? 'var(--accent)' : 'var(--surface-alt)'};
        color:${mine ? '#fff' : 'var(--text)'};
        border:1px solid var(--border); font-size:0.92rem; text-align:left;">
        ${kursEscapeHtml(m.body).replace(/\n/g, '<br>')}
        <div style="font-size:0.72rem; opacity:0.85; margin-top:6px;">
          ${new Date(m.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      </div>
    </div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
};

window.sendKursMessageFromTeacher = function () {
  const student = document.getElementById('kurs-msg-student-select') &&
    document.getElementById('kurs-msg-student-select').value;
  const ta = document.getElementById('kurs-msg-input-teacher');
  const text = ta && ta.value.trim();
  if (!student) { showToastMessage('Öğrenci seçin.'); return; }
  if (!text) { showToastMessage('Mesaj yazın.'); return; }
  if (!kursTeacherHasStudent(currentUsername, student)) {
    showToastMessage('Bu öğrenciye ödev veya sınıf ilişkiniz yok.');
    return;
  }
  const key = kursEnsureThread(currentUsername, student);
  kursThreads[key].messages.push({
    id: 'msg_' + Date.now(),
    from: currentUsername,
    body: text,
    createdAt: new Date().toISOString()
  });
  ta.value = '';
  saveKursData();
  if (typeof window.pushUserAnnouncement === 'function') {
    const prev = text.length > 220 ? text.slice(0, 220) + '…' : text;
    window.pushUserAnnouncement(
      student,
      `💬 Öğretmeninizden mesaj (${typeof window.kursPlainDisplayName === 'function' ? window.kursPlainDisplayName(currentUsername) : currentUsername}): ${prev}`,
      'kurs',
    );
  }
  window.renderTeacherMessageThread();
};

window.renderStudentKursMessaging = function () {
  const wrap = document.getElementById('kurs-student-messages-panel');
  const sel = document.getElementById('kurs-msg-teacher-select-student');
  const ta = document.getElementById('kurs-msg-input-student');
  if (!wrap || !sel) return;
  wrap.style.display = 'block';
  const teachers = kursStudentTeacherList();
  const prev = sel.value;
  if (teachers.length === 0) {
    sel.innerHTML = '<option value="">— Henüz öğretmen yok —</option>';
    sel.disabled = true;
    if (ta) {
      ta.disabled = true;
      ta.placeholder = 'Bir öğretmenin sınıfına eklendiğinizde veya size ödev verildiğinde buradan yazabilirsiniz.';
    }
    const box = document.getElementById('kurs-msg-thread-student');
    if (box) {
      box.innerHTML = '<p style="color:var(--text-dim); font-size:0.92rem;">Öğretmeniniz sizi sınıfa ekleyene veya size ödev verene kadar bu alan kullanılamaz. Sorularınız için öğretmeninizden sınıfa eklenmesini isteyin.</p>';
    }
    return;
  }
  sel.disabled = false;
  if (ta) {
    ta.disabled = false;
    ta.placeholder = 'Mesajınız...';
  }
  sel.innerHTML = '<option value="">— Öğretmen seçin —</option>' +
    teachers.map(t =>
      `<option value=${JSON.stringify(t)}>${kursEscapeHtml(typeof kursFormatStudentOptionLabel === 'function' ? kursFormatStudentOptionLabel(t) : t)}</option>`
    ).join('');
  if (prev && teachers.includes(prev)) sel.value = prev;
  window.renderStudentMessageThread();
};

window.renderStudentMessageThread = function () {
  const sel = document.getElementById('kurs-msg-teacher-select-student');
  const box = document.getElementById('kurs-msg-thread-student');
  if (!sel || !box) return;
  const teacher = sel.value;
  if (!teacher) {
    box.innerHTML = '<p style="color:var(--text-dim); font-size:0.9rem;">Öğretmen seçin.</p>';
    return;
  }
  if (!kursStudentTeacherList().includes(teacher)) {
    box.innerHTML = '<p style="color:var(--error); font-size:0.9rem;">Bu öğretmenle bağlantınız yok.</p>';
    return;
  }
  const key = kursThreadKey(teacher, currentUsername);
  const thread = kursThreads[key];
  const messages = (thread && thread.messages) || [];
  if (messages.length === 0) {
    box.innerHTML = '<p style="color:var(--text-dim); font-size:0.9rem;">Henüz mesaj yok.</p>';
    return;
  }
  box.innerHTML = messages.map(m => {
    const mine = m.from === currentUsername;
    return `<div style="margin-bottom:10px; text-align:${mine ? 'right' : 'left'};">
      <div style="display:inline-block; max-width:85%; padding:10px 14px; border-radius:12px;
        background:${mine ? 'var(--accent2)' : 'var(--surface-alt)'};
        color:${mine ? '#fff' : 'var(--text)'};
        border:1px solid var(--border); font-size:0.92rem; text-align:left;">
        ${kursEscapeHtml(m.body).replace(/\n/g, '<br>')}
        <div style="font-size:0.72rem; opacity:0.85; margin-top:6px;">
          ${new Date(m.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      </div>
    </div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
};

window.sendKursMessageFromStudent = function () {
  const teacher = document.getElementById('kurs-msg-teacher-select-student') &&
    document.getElementById('kurs-msg-teacher-select-student').value;
  const ta = document.getElementById('kurs-msg-input-student');
  const text = ta && ta.value.trim();
  if (!teacher) { showToastMessage('Öğretmen seçin.'); return; }
  if (!text) { showToastMessage('Mesaj yazın.'); return; }
  if (!kursStudentTeacherList().includes(teacher)) {
    showToastMessage('Bu öğretmene mesaj gönderemezsiniz.');
    return;
  }
  const key = kursEnsureThread(teacher, currentUsername);
  kursThreads[key].messages.push({
    id: 'msg_' + Date.now(),
    from: currentUsername,
    body: text,
    createdAt: new Date().toISOString()
  });
  ta.value = '';
  saveKursData();
  if (typeof window.pushUserAnnouncement === 'function') {
    const prev = text.length > 220 ? text.slice(0, 220) + '…' : text;
    window.pushUserAnnouncement(
      teacher,
      `💬 Öğrencinizden mesaj (${typeof window.kursPlainDisplayName === 'function' ? window.kursPlainDisplayName(currentUsername) : currentUsername}): ${prev}`,
      'kurs',
    );
  }
  window.renderStudentMessageThread();
};

// ============================================================
// ÖĞRETMEN — ÖZEL ALIŞTIRMALAR (yalnızca kendi kataloğu)
// ============================================================
window.renderTeacherPrivateMaterials = function () {
  const listEl = document.getElementById('kurs-teacher-mats-list');
  if (!listEl) return;
  const arr = window.getTeacherPrivatePractices();
  if (!arr.length) {
    listEl.innerHTML = '<p style="color:var(--text-dim);">Henüz özel alıştırma yok. Aşağıdan ekleyin.</p>';
    return;
  }
  listEl.innerHTML = arr.map(p => `
    <div style="margin-bottom:10px; padding:12px 14px; border:1px solid var(--border); border-radius:10px; background:var(--surface-alt); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div><strong>${kursEscapeHtml(p.title)}</strong>
        <span style="color:var(--text-dim); font-size:0.8rem; margin-left:8px;">${kursEscapeHtml(p.id)}</span></div>
      <button type="button" class="secondary-btn" style="padding:6px 12px; font-size:0.85rem;"
        onclick="deleteTeacherPrivatePractice(${JSON.stringify(p.id)})">Sil</button>
    </div>`).join('');
};

window.saveTeacherPrivatePracticeFromForm = function () {
  showToastMessage('Alıştırmalar sekmesindeki formdan ekleyin; özel veya genel olarak kaydedebilirsiniz.');
  if (typeof window.switchMainTab === 'function') window.switchMainTab('practice');
};

window.deleteTeacherPrivatePractice = function (id) {
  if (!confirm('Bu özel alıştırmayı silmek istediğinize emin misiniz?')) return;
  if (!dbUserData[currentUsername]) return;
  const arr = dbUserData[currentUsername].teacherPrivatePractices || [];
  dbUserData[currentUsername].teacherPrivatePractices = arr.filter(p => p.id !== id);
  if (typeof saveDb === 'function') saveDb();
  if (typeof syncCloudData === 'function') syncCloudData();
  window.renderTeacherPrivateMaterials();
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

  const assignNote = asgn.teacherMessage
    ? `<div style="margin-top:10px; padding:10px 12px; background:rgba(79,142,247,0.08); border-radius:8px; font-size:0.88rem; color:var(--text); border:1px solid var(--border);">
        <strong style="color:var(--accent);">Öğretmen notu:</strong> ${kursEscapeHtml(asgn.teacherMessage).replace(/\n/g, '<br>')}
      </div>`
    : '';
  let feedbackHtml = '';
  if (asgn.status === 'completed' && asgn.sub) {
    const s = asgn.sub;
    if (s.teacherNote || s.teacherGrade != null) {
      const g = s.teacherGrade != null && s.teacherGrade !== '' ? `<span style="color:var(--accent2); font-weight:bold;">Not: ${kursEscapeHtml(String(s.teacherGrade))}</span> · ` : '';
      const n = s.teacherNote ? kursEscapeHtml(s.teacherNote).replace(/\n/g, '<br>') : '';
      feedbackHtml = `<div style="margin-top:10px; padding:10px 12px; background:rgba(46,204,113,0.08); border-radius:8px; font-size:0.88rem; border:1px solid var(--border);">
        ${g}${n || '<span style="color:var(--text-dim);">Öğretmen değerlendirmesi</span>'}
      </div>`;
    }
  }

  return `<div style="background:var(--surface-alt); border:1px solid var(--border); border-radius:12px;
      padding:18px 20px; margin-bottom:12px; display:flex; justify-content:space-between;
      align-items:flex-start; gap:15px; flex-wrap:wrap;">
    <div style="flex:1; min-width:180px;">
      <div style="font-size:1.05rem; font-weight:bold; margin-bottom:6px;">${typeIcon} ${asgn.contentTitle}</div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <span style="background:rgba(79,142,247,0.15); color:var(--accent); padding:3px 10px; border-radius:20px; font-size:0.8rem;">${typeLabel}</span>
        ${dueBadge}
        <span style="color:var(--text-dim); font-size:0.8rem;">Öğretmen: ${kursEscapeHtml(typeof kursFormatStudentOptionLabel === 'function' ? kursFormatStudentOptionLabel(asgn.teacherUsername) : asgn.teacherUsername)}</span>
      </div>
      ${assignNote}
      ${feedbackHtml}
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
  const prac = getPracticeForKursTask(asgn);
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
  const prac = getPracticeForKursTask(asgn);
  if (!prac || !Array.isArray(prac.questions)) {
    showToastMessage('❌ Alıştırma verisi bulunamadı.');
    return;
  }

  let correct = 0, wrong = 0, empty = 0;
  const answerDetails = [];

  prac.questions.forEach(q => {
    let userAnswer = null;
    let userAnswerRaw = null;
    if (q.type === 'tf' || q.type === 'mc') {
      document.querySelectorAll(`input[name="kq_${q.id}"]`).forEach(r => {
        if (r.checked) userAnswer = r.value;
      });
      userAnswerRaw = userAnswer;
    } else if (q.type === 'fill-write' || q.type === 'fill-select') {
      const el = document.getElementById('kfill_' + q.id);
      userAnswerRaw = el ? el.value.trim() : '';
      userAnswer = userAnswerRaw ? userAnswerRaw.toLowerCase() : null;
    }

    if (!userAnswer || userAnswer === '') empty++;
    else if (userAnswer === String(q.answer).toLowerCase()) correct++;
    else wrong++;

    const ok = !!(userAnswer && userAnswer === String(q.answer).toLowerCase());
    answerDetails.push({
      qid: q.id,
      type: q.type,
      prompt: q.question || '',
      userAnswer: userAnswerRaw != null ? String(userAnswerRaw) : '',
      correctAnswer: String(q.answer),
      ok
    });
  });

  const total     = prac.questions.length;
  const score     = Math.round((correct / total) * 100);
  const timeSpent = Math.floor((Date.now() - startTime) / 1000);

  kursSubmissions[assignmentId + '_' + currentUsername] = {
    studentUsername: currentUsername, assignmentId,
    assignmentType: 'practice',
    score, correct, wrong, empty, total, timeSpent,
    answerDetails,
    completedAt: new Date().toISOString()
  };
  saveKursData();

  const asgnDone = kursAssignments.find(function (a) { return a.id === assignmentId; });
  const teacherT =
    asgnDone &&
    asgnDone.teacherUsername &&
    String(asgnDone.teacherUsername).trim();
  if (teacherT && typeof window.pushUserAnnouncement === 'function') {
    const sn =
      typeof window.kursPlainDisplayName === 'function'
        ? window.kursPlainDisplayName(currentUsername)
        : currentUsername;
    window.pushUserAnnouncement(
      teacherT,
      `✅ ${sn} «${asgnDone.contentTitle || 'Alıştırma'}» ödevini teslim etti (puan %${score}).`,
      'kurs',
    );
  }

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
  const answerDetails = [];
  questions.forEach(q => {
    const a = answers[q.id];
    if (!a) empty++;
    else if (a === q.answer) correct++;
    else wrong++;
    const ok = a && a === q.answer;
    answerDetails.push({
      qid: q.id,
      prompt: q.question || '',
      userAnswer: a || '',
      correctAnswer: q.answer,
      ok: !!ok
    });
  });

  const total     = questions.length;
  const score     = Math.round((correct / total) * 100);
  const timeSpent = Math.floor((Date.now() - startTime) / 1000);

  kursSubmissions[assignmentId + '_' + currentUsername] = {
    studentUsername: currentUsername, assignmentId,
    assignmentType: 'exam',
    score, correct, wrong, empty, total, timeSpent,
    examAnswers: { ...answers },
    answerDetails,
    completedAt: new Date().toISOString()
  };
  saveKursData();

  const asgnExam = kursAssignments.find(function (a) { return a.id === assignmentId; });
  const teacherE =
    asgnExam &&
    asgnExam.teacherUsername &&
    String(asgnExam.teacherUsername).trim();
  if (teacherE && typeof window.pushUserAnnouncement === 'function') {
    const sn =
      typeof window.kursPlainDisplayName === 'function'
        ? window.kursPlainDisplayName(currentUsername)
        : currentUsername;
    window.pushUserAnnouncement(
      teacherE,
      `✅ ${sn} «${asgnExam.contentTitle || 'Sınav'}» ödevini teslim etti (puan %${score}).`,
      'kurs',
    );
  }

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
