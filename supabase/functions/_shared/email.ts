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

export type FieldGroupId = "general" | "student" | "volunteer";

export interface EmailField {
  key: string;
  label: string;
  sample: string;
}

/**
 * Built-in placeholders an admin can insert as {{key}}, grouped for the "Insert field"
 * menu and listed in the order the source form asks for them. Custom forms (Settings →
 * Forms/Link, including /volunteer) add their own groups at runtime as {{form.<form>.<field>}}.
 */
export const FIELD_GROUPS: { id: FieldGroupId; label: string; fields: EmailField[] }[] = [
  {
    id: "general",
    label: "General",
    fields: [
      { key: "site_link", label: "Website link", sample: SITE_URL },
      { key: "admin_link", label: "Admin page link", sample: `${SITE_URL}/admin` },
    ],
  },
  {
    id: "student",
    label: "Student Registration",
    fields: [
      { key: "student_name", label: "Student name", sample: "Sam Rivera" },
      { key: "grade", label: "Grade", sample: "3rd" },
      { key: "gender", label: "Gender", sample: "Female" },
      { key: "school_name", label: "School name", sample: "Oak Hill Elementary" },
      { key: "guardian_name", label: "Parent/guardian name", sample: "Alex Rivera" },
      { key: "guardian_phone", label: "Parent/guardian phone", sample: "(555) 123-4567" },
      { key: "guardian_email", label: "Parent/guardian email", sample: "parent@email.com" },
      { key: "availability", label: "Availability", sample: "Mon/Wed 7:00 – 7:30 PM" },
    ],
  },
  {
    id: "volunteer",
    label: "Volunteer account",
    fields: [
      { key: "volunteer_name", label: "Volunteer name", sample: "Jordan Lee" },
      { key: "volunteer_email", label: "Volunteer email", sample: "volunteer@email.com" },
    ],
  },
];

/** All built-in fields by key (labels and preview samples). */
export const EMAIL_FIELDS: Record<string, EmailField> = Object.fromEntries(
  FIELD_GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f]),
);

/** Placeholder key for a custom form's field. `formKey` is the form's slug (or id). */
export const formFieldKey = (formKey: string, fieldName: string) => `form.${formKey}.${fieldName}`;

/** Form field types that hold an answer (headings and paragraphs are just text on the form). */
export const ANSWER_FIELD_TYPES = ["text", "email", "tel", "number", "date", "textarea", "select", "checkbox"];

/**
 * `groups`: built-in field groups that can be filled for this email (custom form fields
 * always can, from the recipient's own answers). `englishOnly`: the recipient's language
 * isn't known (volunteers, the admin inbox), so only the English template is used.
 */
export const EMAIL_PURPOSES: { id: EmailPurpose; label: string; groups: FieldGroupId[]; englishOnly?: boolean }[] = [
  { id: "registration_received", label: "Registration received (to guardian)", groups: ["general", "student"] },
  { id: "registration_approved", label: "Registration approved (to guardian)", groups: ["general", "student"] },
  { id: "registration_rejected", label: "Registration not accepted (to guardian)", groups: ["general", "student"] },
  { id: "volunteer_verified", label: "Volunteer verified (to volunteer)", groups: ["general", "volunteer"], englishOnly: true },
  { id: "admin_new_registration", label: "New registration notice (to info@)", groups: ["general", "student"], englishOnly: true },
];

/** Readable labels for the student form's coded answers, in the email's language. */
const GENDER_LABELS: Record<string, Record<EmailLanguage, string>> = {
  male: { en: "Male", es: "Masculino" },
  female: { en: "Female", es: "Femenino" },
  other: { en: "Other", es: "Otro" },
  "prefer-not-to-say": { en: "Prefer not to say", es: "Prefiero no decir" },
};
const AVAILABILITY_LABELS: Record<string, Record<EmailLanguage, string>> = {
  "mon-wed-7-730": { en: "Mon/Wed 7:00 – 7:30 PM", es: "Lun/Mié 7:00 – 7:30 PM" },
  "mon-wed-730-8": { en: "Mon/Wed 7:30 – 8:00 PM", es: "Lun/Mié 7:30 – 8:00 PM" },
};

const label = (map: Record<string, Record<EmailLanguage, string>>, code: unknown, lang: EmailLanguage) => {
  const c = typeof code === "string" ? code : "";
  return map[c]?.[lang] ?? c;
};

/** Student Registration field values from a registrations row (answers also live in its notes JSON). */
export const studentFieldValues = (
  reg: { guardian_name?: string | null; guardian_email?: string | null; guardian_phone?: string | null; school_name?: string | null; grade_level?: string | null; notes?: string | null },
  lang: EmailLanguage,
): Record<string, string> => {
  let notes: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(reg.notes ?? "{}");
    if (parsed && typeof parsed === "object") notes = parsed;
  } catch {
    // notes not JSON
  }
  return {
    student_name: String(notes.student_name ?? ""),
    grade: reg.grade_level ?? "",
    gender: label(GENDER_LABELS, notes.gender, lang),
    school_name: reg.school_name ?? "",
    guardian_name: reg.guardian_name ?? "",
    guardian_phone: reg.guardian_phone ?? "",
    guardian_email: reg.guardian_email ?? "",
    availability: label(AVAILABILITY_LABELS, notes.availability, lang),
  };
};

/** Turns a custom form answer into text for an email. */
export const answerText = (value: unknown, lang: EmailLanguage) => {
  if (value === true) return lang === "es" ? "Sí" : "Yes";
  if (value === false) return "No";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? "" : String(value);
};

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

/** Matches {{field}} and {{form.<form>.<field>}} placeholders. */
export const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;

/**
 * Replaces {{field}} placeholders. Values are HTML-escaped unless `asText` is set
 * (for the subject line). Placeholders without a value are left as they are, or
 * removed with `blankMissing` (when sending, so nobody receives a raw {{field}}).
 */
export const fillFields = (template: string, values: Record<string, string>, asText = false, blankMissing = false) =>
  template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    if (!(key in values)) return blankMissing ? "" : match;
    return asText ? values[key].replace(/[\r\n]+/g, " ") : escapeHtml(values[key]);
  });

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
