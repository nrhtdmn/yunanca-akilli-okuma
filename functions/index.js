/**
 * Duyuru belgesi (global/announcements) güncellenince, e-posta adresi kayıtlı üyelere mail atar.
 *
 * Kurulum (Firebase CLI):
 *   firebase functions:config:set smtp.user="gonderici@gmail.com" smtp.pass="uygulama-sifresi" smtp.from="Yunanca <gonderici@gmail.com>"
 *   İsteğe bağlı: smtp.host, smtp.port, smtp.secure
 *   firebase deploy --only functions
 *
 * Gmail: 2FA açık → Google Hesabı → Uygulama şifreleri ile "smtp.pass" üretin.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

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

    const transporter = nodemailer.createTransport({
      host: smtp.host || "smtp.gmail.com",
      port: Number(smtp.port || 465),
      secure: smtp.secure !== "false" && smtp.secure !== false,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    const from = smtp.from || smtp.user;
    const subject = "Yunanca Akıllı Okuyucu — Yeni duyuru";

    const usersSnap = await admin.firestore().doc("global/users").get();
    if (!usersSnap.exists) return null;
    const users = usersSnap.data() || {};

    let sent = 0;
    for (const key of Object.keys(users)) {
      const u = users[key];
      if (!u || typeof u !== "object") continue;
      if (u.emailNotify === false) continue;
      const to = u.email;
      if (!to || typeof to !== "string" || !to.includes("@")) continue;

      const raw = String(latest.text || "");
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
