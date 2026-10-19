// Email purposes, built-in wording, {{field}} filling and layouts. Shared by the
// send-email edge function (Deno) and the admin Emails editor (Vite), so the
// preview is exactly what recipients get.
// Keep this file dependency-free: no imports, no Deno or browser APIs.

export const SITE_URL = "https://ebookbuddy.org";
export const EMAIL_LOGO_URL = `${SITE_URL}/email-logo.png`;

export type EmailLayout = "classic" | "banner" | "minimal" | "newsletter";
export type EmailLanguage = "en" | "es";
export type EmailPurpose =
  | "registration_received"
  | "registration_approved"
  | "registration_rejected"
  | "volunteer_verified"
  | "admin_new_registration";

export const EMAIL_LAYOUTS: { id: EmailLayout; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "Logo on top, white card" },
  { id: "banner", label: "Banner", description: "Navy header bar with logo and name" },
  { id: "minimal", label: "Minimal", description: "Plain, letter-like" },
  { id: "newsletter", label: "Newsletter", description: "Centered header, accent stripe, full footer" },
];

/** Placeholders an admin can insert as {{key}}; filled in when the email is sent. */
export const EMAIL_FIELDS: Record<string, { label: string; sample: string }> = {
  guardian_name: { label: "Guardian name", sample: "Alex Rivera" },
  volunteer_name: { label: "Volunteer name", sample: "Jordan Lee" },
  site_link: { label: "Website link", sample: SITE_URL },
  admin_link: { label: "Admin page link", sample: `${SITE_URL}/admin` },
};

/**
 * `englishOnly`: the recipient's language isn't known (volunteers, the admin inbox),
 * so only the English template is used.
 */
export const EMAIL_PURPOSES: { id: EmailPurpose; label: string; fields: string[]; englishOnly?: boolean }[] = [
  { id: "registration_received", label: "Registration received (to guardian)", fields: ["guardian_name", "site_link"] },
  { id: "registration_approved", label: "Registration approved (to guardian)", fields: ["guardian_name", "site_link"] },
  { id: "registration_rejected", label: "Registration not accepted (to guardian)", fields: ["guardian_name", "site_link"] },
  { id: "volunteer_verified", label: "Volunteer verified (to volunteer)", fields: ["volunteer_name", "site_link"], englishOnly: true },
  { id: "admin_new_registration", label: "New registration notice (to info@)", fields: ["admin_link"], englishOnly: true },
];

/** Used for a missing name so greetings never read "Hi ,". */
export const NAME_FALLBACK: Record<EmailLanguage, string> = { en: "there", es: "familia" };

type DefaultEmail = { subject: string; body: string };

/** Built-in wording, used when no saved template matches. Bodies may use {{fields}}. */
export const DEFAULT_EMAILS: Record<EmailPurpose, Partial<Record<EmailLanguage, DefaultEmail>> & { en: DefaultEmail }> = {
  registration_received: {
    en: {
      subject: "We received your eBookBuddy registration",
      body: `<p>Hi {{guardian_name}},</p>
<p>Thank you for registering your child with eBookBuddy! We've received your application.</p>
<p>Our team will review it and email you as soon as there's an update.</p>`,
    },
    es: {
      subject: "Recibimos su inscripción en eBookBuddy",
      body: `<p>Hola {{guardian_name}}:</p>
<p>¡Gracias por inscribir a su hijo/a en eBookBuddy! Recibimos su solicitud.</p>
<p>Nuestro equipo la revisará y le enviaremos un correo cuando tengamos una respuesta.</p>`,
    },
  },
  registration_approved: {
    en: {
      subject: "Your eBookBuddy registration is approved!",
      body: `<p>Hi {{guardian_name}},</p>
<p>Good news! Your child's eBookBuddy registration has been approved.</p>
<p>We'll be in touch soon with the next steps for starting reading sessions.</p>`,
    },
    es: {
      subject: "¡Su inscripción en eBookBuddy fue aprobada!",
      body: `<p>Hola {{guardian_name}}:</p>
<p>¡Buenas noticias! La inscripción de su hijo/a en eBookBuddy fue aprobada.</p>
<p>Nos pondremos en contacto pronto con los próximos pasos para comenzar las sesiones de lectura.</p>`,
    },
  },
  registration_rejected: {
    en: {
      subject: "An update on your eBookBuddy registration",
      body: `<p>Hi {{guardian_name}},</p>
<p>Thank you for your interest in eBookBuddy. Unfortunately, we aren't able to accept your child's registration at this time.</p>
<p>If you have any questions, just reply to this email and we'll be glad to help.</p>`,
    },
    es: {
      subject: "Actualización sobre su inscripción en eBookBuddy",
      body: `<p>Hola {{guardian_name}}:</p>
<p>Gracias por su interés en eBookBuddy. En este momento no podemos aceptar la inscripción de su hijo/a.</p>
<p>Si tiene preguntas, responda a este correo y con gusto le ayudaremos.</p>`,
    },
  },
  volunteer_verified: {
    en: {
      subject: "You're verified as an eBookBuddy volunteer!",
      body: `<p>Hi {{volunteer_name}},</p>
<p>Thank you for volunteering! Your eBookBuddy volunteer account is now verified.</p>
<p>To join a reading session, sign in at <a href="${SITE_URL}">ebookbuddy.org</a>, open your dashboard, and click <strong>Online Meeting Room</strong>.</p>
<p>If the button isn't available yet, an administrator still needs to assign you to a meeting room. We'll let you know.</p>`,
    },
  },
  admin_new_registration: {
    en: {
      subject: "New student registration on eBookBuddy",
      body: `<p>A new student registration was just submitted.</p>
<p>Review it in <a href="${SITE_URL}/admin">Admin → Registrations</a>.</p>`,
    },
  },
};

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Replaces {{field}} placeholders. Values are HTML-escaped unless `asText` is set
 * (for the subject line). Unknown placeholders are left as they are.
 */
export const fillFields = (template: string, values: Record<string, string>, asText = false) =>
  template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) =>
    key in values ? (asText ? values[key].replace(/[\r\n]+/g, " ") : escapeHtml(values[key])) : match,
  );

/** Plain-text version for mail apps that don't show HTML. */
export const htmlToText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|div)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const FOOTER: Record<EmailLanguage, string> = {
  en: "Questions? Just reply to this email.",
  es: "¿Preguntas? Responda a este correo.",
};

// Mail apps ignore most CSS, so keep body styles simple and also inline the key ones.
const BODY_CSS = `
  .content p { margin: 0 0 16px; }
  .content h1 { font-size: 26px; line-height: 1.3; margin: 0 0 16px; }
  .content h2 { font-size: 21px; line-height: 1.3; margin: 0 0 14px; }
  .content h3 { font-size: 18px; line-height: 1.3; margin: 0 0 12px; }
  .content ul, .content ol { margin: 0 0 16px; padding-left: 24px; }
  .content li { margin: 0 0 6px; }
  .content img { max-width: 100%; height: auto; border-radius: 8px; }
  .content a { color: #1f6fb2; }
  .content blockquote { margin: 0 0 16px; padding-left: 14px; border-left: 3px solid #d1d5db; color: #4b5563; }
`;

const page = (bg: string, inner: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${BODY_CSS}</style></head>
<body style="margin:0;padding:24px 12px;background:${bg};font-family:Arial,Helvetica,sans-serif;color:#1f2937">
${inner}
</body></html>`;

const logo = (size: number) =>
  `<img src="${EMAIL_LOGO_URL}" width="${size}" height="${size}" alt="eBookBuddy" style="border-radius:12px;display:block">`;

const siteLink = (color: string) => `<a href="${SITE_URL}" style="color:${color}">ebookbuddy.org</a>`;

/** Wraps an email body (HTML from the editor, fields already filled) in the chosen layout. */
export const renderEmail = (layout: EmailLayout, bodyHtml: string, lang: EmailLanguage = "en") => {
  const body = `<div class="content" style="font-size:16px;line-height:1.6">${bodyHtml}</div>`;
  const footerText = FOOTER[lang] ?? FOOTER.en;

  switch (layout) {
    case "banner":
      return page(
        "#eef2f7",
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#1e3a5f;padding:20px 32px">
    <table role="presentation" cellspacing="0" cellpadding="0"><tr>
      <td>${logo(44)}</td>
      <td style="padding-left:14px;font-size:22px;font-weight:bold;color:#ffffff">eBookBuddy</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px 12px">${body}</td></tr>
  <tr><td style="padding:16px 32px 28px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">eBookBuddy · ${siteLink("#6b7280")} · ${footerText}</td></tr>
</table>`,
      );

    case "minimal":
      return page(
        "#ffffff",
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto">
  <tr><td style="padding:8px 8px 16px">${body}</td></tr>
  <tr><td style="padding:16px 8px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">
    <table role="presentation" cellspacing="0" cellpadding="0"><tr>
      <td>${logo(28)}</td>
      <td style="padding-left:10px">eBookBuddy · ${siteLink("#6b7280")} · ${footerText}</td>
    </tr></table>
  </td></tr>
</table>`,
      );

    case "newsletter":
      return page(
        "#f3f4f6",
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td align="center" style="padding:28px 32px 16px">${logo(64)}
    <div style="margin-top:10px;font-size:20px;font-weight:bold;color:#1e3a5f">eBookBuddy</div>
    <div style="font-size:13px;color:#6b7280">Where reading becomes an adventure</div>
  </td></tr>
  <tr><td style="height:6px;background:#6ec6e6;line-height:6px;font-size:0">&nbsp;</td></tr>
  <tr><td style="padding:28px 32px 12px">${body}</td></tr>
  <tr><td align="center" style="background:#1e3a5f;padding:22px 32px;font-size:13px;line-height:1.6;color:#d1d9e6">
    <strong style="color:#ffffff">eBookBuddy</strong><br>
    ${siteLink("#ffffff")}<br>
    ${footerText}
  </td></tr>
</table>`,
      );

    case "classic":
    default:
      return page(
        "#f7f5f0",
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px">
  <tr><td style="padding:28px 32px 8px">${logo(56)}</td></tr>
  <tr><td style="padding:8px 32px 24px">${body}</td></tr>
  <tr><td style="padding:16px 32px 28px;border-top:1px solid #eee;font-size:13px;color:#6b7280">eBookBuddy · ${siteLink("#6b7280")} · ${footerText}</td></tr>
</table>`,
      );
  }
};
