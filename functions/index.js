/**
 * Pareez Cloud Functions.
 *
 * notifyNewBooking — emails the salon the moment a customer submits the
 * booking form on pareezsalon.com (a `webBookings` document is created).
 * The customer is also sent to WhatsApp by the website, but this alert
 * fires even if they never press send there.
 *
 * Requires the GMAIL_APP_PASSWORD secret (a Google "app password" for
 * pareez.salon@gmail.com):  firebase functions:secrets:set GMAIL_APP_PASSWORD
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

const SALON_EMAIL = "pareez.salon@gmail.com";
const DASHBOARD_URL = "https://pareez-billing-admin-dashboard.vercel.app/website";

/** "+91 98xxx xxxxx" → wa.me link, assuming Indian numbers when 10 digits. */
function waLink(phone, message) {
  const digits = String(phone).replace(/\D/g, "").replace(/^0+/, "");
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

exports.notifyNewBooking = onDocumentCreated(
  {
    document: "webBookings/{bookingId}",
    region: "us-central1", // DB is in nam5; the trigger location is matched to it automatically
    secrets: [gmailAppPassword],
    memory: "256MiB",
    maxInstances: 3,
  },
  async (event) => {
    const b = event.data?.data();
    if (!b) return;

    const reply = waLink(
      b.phone,
      `Hi ${b.name}! This is Pareez Salon — about your ${b.service} appointment request for ${b.date} at ${b.time} (${b.branchName}). `
    );

    const rows = [
      ["Name", b.name],
      ["Phone", b.phone],
      ["Branch", b.branchName],
      ["Service", b.service],
      ["Date", b.date],
      ["Time", b.time],
      ["Notes", b.notes || "—"],
      ["Device", b.device || "—"],
    ]
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 14px 6px 0;color:#64748b;white-space:nowrap">${k}</td>` +
          `<td style="padding:6px 0;color:#0f172a;font-weight:600">${esc(v)}</td></tr>`
      )
      .join("");

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px">
        <h2 style="color:#0f172a;margin:0 0 4px">New appointment request 💇</h2>
        <p style="color:#64748b;margin:0 0 16px">From the booking form on pareezsalon.com</p>
        <table style="border-collapse:collapse;font-size:15px">${rows}</table>
        <p style="margin:20px 0 0">
          <a href="${reply}" style="background:#22c55e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Reply on WhatsApp</a>
          &nbsp;&nbsp;
          <a href="${DASHBOARD_URL}" style="color:#ec4899;font-weight:600">Open dashboard →</a>
        </p>
      </div>`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SALON_EMAIL, pass: gmailAppPassword.value() },
    });

    await transporter.sendMail({
      from: `"Pareez Website" <${SALON_EMAIL}>`,
      to: SALON_EMAIL,
      subject: `New booking request — ${b.name} · ${b.service} · ${b.date} ${b.time}`,
      html,
    });
  }
);
