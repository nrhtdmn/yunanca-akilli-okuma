/**
 * Duyuru belgesi (global/announcements) güncellenince, e-posta adresi kayıtlı üyelere mail atar.
 *
 * Kurulum (Firebase CLI, proje kökünde):
 *   firebase login
 *   firebase use <proje-id>
 *   firebase functions:config:set \
 *     smtp.user="gonderici@gmail.com" \
 *     smtp.pass="UYGULAMA_SIFRESI" \
 *     smtp.from="Yunanca <gonderici@gmail.com>"
 *
 * Gmail (önerilen — 587 STARTTLS):
 *   firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="587" smtp.secure="false" ...
 * Gmail (465 SSL):
 *   smtp.port="465" ve smtp.secure="true" (varsayılanlar buna yakın)
 *
 * Diğer sağlayıcılar: smtp.host, smtp.port, smtp.secure uyumlu ayarlayın.
 *
 *   firebase deploy --only functions
 *
 * Gmail: 2FA açık → Google Hesabı → Güvenlik → Uygulama şifreleri.
 *
 * Sorun giderme: Firebase Console → Functions → Günlükler (SMTP yok / gönderim hatası satırları).
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

/** Gmail: 465 (SSL) veya 587 (STARTTLS). smtp.secure="false" → 587 kullanın. */
function createSmtpTransport(smtp) {
  let port = Number(smtp.port || 465);
  const wantInsecure =
    smtp.secure === "false" || smtp.secure === false;
  if (wantInsecure && port === 465) {
    port = 587;
  }
  const useTls = port === 587;
  return nodemailer.createTransport({
    host: smtp.host || "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: useTls,
    auth: { user: smtp.user, pass: smtp.pass },
    tls: { rejectUnauthorized: true },
  });
}

exports.onAnnouncementForEmail = functions.firestore
  .document("global/announcements")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after || !Array.isArray(after.list) || after.list.length === 0) {
      return null;
    }
    const before = change.before.exists ? change.before.data() : { list: [] };
    const listBefore = before.list || [];
    const listAfter = after.list;
    const latest = listAfter[0];
    const prevFirst = listBefore[0];
    if (
      prevFirst &&
      latest &&
      prevFirst.id === latest.id &&
      listAfter.length === listBefore.length
    ) {
      return null;
    }

    const smtp = functions.config().smtp;
    if (!smtp || !smtp.user || !smtp.pass) {
      functions.logger.info(
        "SMTP yapılandırılmadı; e-posta atlanıyor. firebase functions:config:set smtp.user smtp.pass",
      );
      return null;
    }

    const from = smtp.from || smtp.user;
    const subject = latest.forUsername
      ? "Yunanca Akıllı Okuyucu — Size özel bildirim"
      : "Yunanca Akıllı Okuyucu — Yeni duyuru";

    const usersSnap = await admin.firestore().doc("global/users").get();
    if (!usersSnap.exists) return null;
    const users = usersSnap.data() || {};

    const raw = String(latest.text || "");
    /** Kişisel bildirim: yalnız ilgili kullanıcıya e-posta (tüm üyelere spam olmasın) */
    if (latest.forUsername) {
      const u = users[latest.forUsername];
      if (!u || typeof u !== "object" || u.emailNotify === false) {
        functions.logger.info("Hedefli duyuru — e-posta atlanıyor (kullanıcı/izin yok)", {
          forUsername: latest.forUsername,
        });
        return null;
      }
      const to = resolveUserEmail(users, latest.forUsername);
      if (!to) {
        functions.logger.info("Hedefli duyuru — adres yok", {
          forUsername: latest.forUsername,
        });
        return null;
      }
      const transporter = createSmtpTransport(smtp);
      const text = raw.replace(/</g, "&lt;");
      const html =
        `<p style="font-family:sans-serif;line-height:1.5;">` +
        text.replace(/\n/g, "<br>") +
        `</p>` +
        (latest.link
          ? `<p><a href="${encodeURI(String(latest.link))}">${String(
              latest.link,
            )}</a></p>`
          : "");
      try {
        await transporter.sendMail({
          from,
          to,
          subject,
          html,
          text: raw + (latest.link ? "\n\n" + latest.link : ""),
        });
        functions.logger.info("Hedefli duyuru e-postası", { to });
      } catch (e) {
        functions.logger.error("Mail gönderilemedi", { to, err: String(e) });
      }
      return null;
    }

    const transporter = createSmtpTransport(smtp);
    let sent = 0;
    for (const key of Object.keys(users)) {
      const u = users[key];
      if (!u || typeof u !== "object") continue;
      if (u.emailNotify === false) continue;
      const to = resolveUserEmail(users, key);
      if (!to) continue;

      const text = raw.replace(/</g, "&lt;");
      const html =
        `<p style="font-family:sans-serif;line-height:1.5;">` +
        text.replace(/\n/g, "<br>") +
        `</p>` +
        (latest.link
          ? `<p><a href="${encodeURI(String(latest.link))}">${String(
              latest.link,
            )}</a></p>`
          : "");

      try {
        await transporter.sendMail({
          from,
          to,
          subject,
          html,
          text: raw + (latest.link ? "\n\n" + latest.link : ""),
        });
        sent++;
      } catch (e) {
        functions.logger.error("Mail gönderilemedi", { to, err: String(e) });
      }
    }

    functions.logger.info("Duyuru e-postaları", { sent });
    return null;
  });

/**
 * Kurs verisi (global/kurs_data): yeni ödev, teslim veya mesajda ilgili kişilere e-posta.
 * Aynı SMTP yapılandırması (smtp.user, smtp.pass) kullanılır.
 */
function resolveUserEmail(users, username) {
  if (!username || typeof username !== "string") return null;
  const u = users[username];
  const tryAddr = (a) =>
    a && typeof a === "string" && a.includes("@") ? a.trim().toLowerCase() : null;
  if (u && typeof u === "object") {
    const c = tryAddr(u.contactEmail);
    if (c) return c;
    const e = tryAddr(u.email);
    if (e) return e;
  }
  return tryAddr(username);
}

function wantsEmail(u) {
  return !u || u.emailNotify !== false;
}

/** İlk belge oluşturulurken içe aktarma sanılan çok sayıda ödev → öğrenci maili gönderme */
const KURS_FIRST_WRITE_ASSIGN_CAP = 40;

exports.onKursDataForEmail = functions.firestore
  .document("global/kurs_data")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;

    const isFirstWrite = !change.before.exists;
    if (isFirstWrite) {
      const n = Array.isArray(after.assignments) ? after.assignments.length : 0;
      if (n > KURS_FIRST_WRITE_ASSIGN_CAP) {
        functions.logger.info(
          "kurs_data ilk yazım — çok sayıda ödev; ödev e-postaları atlanıyor (içe aktarma koruması)",
          { count: n },
        );
        return null;
      }
      functions.logger.info(
        "kurs_data ilk yazım — yalnız yeni ödev mailleri gönderilecek; teslim/mesaj geçmişi yok sayılır",
      );
    }

    const smtp = functions.config().smtp;
    if (!smtp || !smtp.user || !smtp.pass) {
      functions.logger.info(
        "SMTP yok; kurs e-postaları atlanıyor.",
      );
      return null;
    }

    const transporter = createSmtpTransport(smtp);
    const from = smtp.from || smtp.user;

    const usersSnap = await admin.firestore().doc("global/users").get();
    const users = usersSnap.exists ? usersSnap.data() || {} : {};

    const before = change.before.exists ? change.before.data() : {};
    const beforeAssign = before.assignments || [];
    const afterAssign = after.assignments || [];
    const beforeIds = new Set(beforeAssign.map((a) => a.id));
    const newAssignments = afterAssign.filter((a) => a && a.id && !beforeIds.has(a.id));

    const beforeSub = before.submissions || {};
    const afterSub = after.submissions || {};
    const newSubmissionKeys = Object.keys(afterSub).filter((k) => !beforeSub[k]);

    const beforeThreads = before.threads || {};
    const afterThreads = after.threads || {};

    let sent = 0;

    const send = async (to, subject, text, html) => {
      if (!to || !to.includes("@")) return;
      try {
        await transporter.sendMail({ from, to, subject, text, html });
        sent++;
      } catch (e) {
        functions.logger.error("Kurs mail hatası", { to, err: String(e) });
      }
    };

    // —— Yeni ödevler → öğrencilere
    for (const asgn of newAssignments) {
      const title = asgn.contentTitle || "Ödev";
      const teacher = asgn.teacherUsername || "";
      const due = asgn.dueDate
        ? new Date(asgn.dueDate).toLocaleDateString("tr-TR")
        : "Süresiz";
      const note = asgn.teacherMessage
        ? `\n\nÖğretmen notu:\n${String(asgn.teacherMessage)}`
        : "";
      const list = Array.isArray(asgn.studentUsernames)
        ? asgn.studentUsernames
        : [];
      for (const stu of list) {
        const u = users[stu];
        if (u && !wantsEmail(u)) continue;
        const to = resolveUserEmail(users, stu);
        if (!to) continue;
        const subj = "Yunanca Akıllı Okuyucu — Yeni ödev";
        const body =
          `Merhaba,\n\n${teacher} size yeni bir ödev verdi.\n\n` +
          `İçerik: ${title}\nSon tarih: ${due}${note}\n\n` +
          `Uygulamada Kurs sekmesinden erişebilirsiniz.\n`;
        const html =
          `<p style="font-family:sans-serif;line-height:1.5;">` +
          `Merhaba,</p>` +
          `<p><strong>${escapeHtml(teacher)}</strong> size yeni bir ödev verdi.</p>` +
          `<p><strong>İçerik:</strong> ${escapeHtml(title)}<br/>` +
          `<strong>Son tarih:</strong> ${escapeHtml(due)}</p>` +
          (asgn.teacherMessage
            ? `<p><strong>Öğretmen notu:</strong><br/>${escapeHtml(
                String(asgn.teacherMessage),
              ).replace(/\n/g, "<br/>")}</p>`
            : "") +
          `<p style="color:#666;font-size:0.9rem;">Uygulamada Kurs bölümünden erişebilirsiniz.</p>`;
        await send(to, subj, body, html);
      }
    }

    // —— Mevcut teslimde öğretmen notu / puan güncellendi → öğrenciye
    if (!isFirstWrite)
    for (const key of Object.keys(afterSub)) {
      const cur = afterSub[key];
      const prev = beforeSub[key];
      if (!cur || !cur.studentUsername || !prev) continue;
      const noteDiff =
        String(cur.teacherNote || "") !== String(prev.teacherNote || "");
      const gradeDiff = cur.teacherGrade !== prev.teacherGrade;
      if (!noteDiff && !gradeDiff) continue;
      const stu = cur.studentUsername;
      const u = users[stu];
      if (u && !wantsEmail(u)) continue;
      const to = resolveUserEmail(users, stu);
      if (!to) continue;
      const parts = [];
      if (cur.teacherGrade != null && cur.teacherGrade !== "")
        parts.push(`Puan: ${cur.teacherGrade}`);
      if (cur.teacherNote) parts.push(`Yorum: ${cur.teacherNote}`);
      const subj = "Yunanca Akıllı Okuyucu — Öğretmen değerlendirmesi";
      const body =
        `Merhaba,\n\nÖğretmeniniz ödeviniz için güncelleme yaptı:\n\n` +
        parts.join("\n\n") +
        `\n\nKurs bölümünden detayları görebilirsiniz.\n`;
      const html =
        `<p style="font-family:sans-serif;">Merhaba,</p>` +
        `<p>Öğretmeniniz ödeviniz için geri bildirim bıraktı.</p>` +
        (cur.teacherGrade != null && cur.teacherGrade !== ""
          ? `<p><strong>Puan:</strong> ${escapeHtml(String(cur.teacherGrade))}</p>`
          : "") +
        (cur.teacherNote
          ? `<p><strong>Yorum:</strong><br/>${escapeHtml(
              String(cur.teacherNote),
            ).replace(/\n/g, "<br/>")}</p>`
          : "") +
        `<p style="color:#666;font-size:0.9rem;">Kurs bölümünden kontrol edebilirsiniz.</p>`;
      await send(to, subj, body, html);
    }

    // —— Yeni teslimler → öğretmene
    if (!isFirstWrite)
    for (const key of newSubmissionKeys) {
      const sub = afterSub[key];
      if (!sub || !sub.assignmentId) continue;
      const asgn = afterAssign.find((a) => a.id === sub.assignmentId);
      const teacherName = (asgn && asgn.teacherUsername) || sub.teacherUsername;
      if (!teacherName) continue;
      const u = users[teacherName];
      if (u && !wantsEmail(u)) continue;
      const to = resolveUserEmail(users, teacherName);
      if (!to) continue;
      const student = sub.studentUsername || key.split("_").pop();
      const score = sub.score != null ? String(sub.score) : "?";
      const subj = "Yunanca Akıllı Okuyucu — Ödev teslim edildi";
      const body =
        `Merhaba,\n\n${student} ödevini teslim etti.\n\n` +
        `Puan: %${score}\n` +
        `Ödev: ${asgn ? asgn.contentTitle || "" : sub.assignmentId}\n`;
      const html =
        `<p style="font-family:sans-serif;">Merhaba,</p>` +
        `<p><strong>${escapeHtml(String(student))}</strong> ödevini teslim etti.</p>` +
        `<p><strong>Puan:</strong> %${escapeHtml(score)}</p>` +
        `<p><strong>Ödev:</strong> ${escapeHtml(
          asgn ? asgn.contentTitle || "" : sub.assignmentId,
        )}</p>`;
      await send(to, subj, body, html);
    }

    // —— Yeni mesajlar → karşı tarafa
    if (!isFirstWrite)
    for (const tkey of Object.keys(afterThreads)) {
      const aft = afterThreads[tkey];
      const bef = beforeThreads[tkey];
      const arrBefore = bef && bef.messages ? bef.messages : [];
      const arrAfter = aft && aft.messages ? aft.messages : [];
      if (arrAfter.length <= arrBefore.length) continue;
      let teacher = aft.teacherUsername;
      let student = aft.studentUsername;
      if (!teacher || !student) {
        const parts = String(tkey).split("|||");
        if (parts.length >= 2) {
          if (!teacher) teacher = parts[0];
          if (!student) student = parts[1];
        }
      }
      for (let i = arrBefore.length; i < arrAfter.length; i++) {
        const msg = arrAfter[i];
        if (!msg || !msg.from || !msg.body) continue;
        const isFromTeacher = teacher && msg.from === teacher;
        const recipient = isFromTeacher ? student : teacher;
        if (!recipient) continue;
        const ru = users[recipient];
        if (ru && !wantsEmail(ru)) continue;
        const to = resolveUserEmail(users, recipient);
        if (!to) continue;
        const subj = "Yunanca Akıllı Okuyucu — Yeni mesaj";
        const preview = String(msg.body).slice(0, 500);
        const body =
          `Merhaba,\n\n${msg.from} size mesaj gönderdi:\n\n${preview}\n`;
        const html =
          `<p style="font-family:sans-serif;">Merhaba,</p>` +
          `<p><strong>${escapeHtml(String(msg.from))}</strong> size mesaj gönderdi:</p>` +
          `<blockquote style="border-left:3px solid #4f8ef7;padding-left:12px;">${escapeHtml(
            String(msg.body),
          ).replace(/\n/g, "<br/>")}</blockquote>`;
        await send(to, subj, body, html);
      }
    }

    if (sent > 0) functions.logger.info("Kurs e-postaları gönderildi", { sent });
    return null;
  });

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
