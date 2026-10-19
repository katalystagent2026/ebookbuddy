import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FROM = "eBookBuddy <noreply@ebookbuddy.org>";
const REPLY_TO = "info@ebookbuddy.org";
const ADMIN_INBOX = "info@ebookbuddy.org";
const SITE = "https://ebookbuddy.org";
const LOGO = `${SITE}/email-logo.png`;
// The public form may only trigger a confirmation for a registration this fresh.
const CONFIRMATION_WINDOW_MINUTES = 15;

type Lang = "en" | "es";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Wraps paragraphs in a simple branded layout. Recipients' names are escaped by the caller. */
const layout = (paragraphs: string[], footer: string) => `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px">
    <tr><td style="padding:28px 32px 8px"><img src="${LOGO}" width="56" height="56" alt="eBookBuddy" style="border-radius:12px"></td></tr>
    <tr><td style="padding:8px 32px 24px;font-size:16px;line-height:1.6">
      ${paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join("\n      ")}
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid #eee;font-size:13px;color:#6b7280">${footer}</td></tr>
  </table>
</body></html>`;

const FOOTER: Record<Lang, string> = {
  en: `eBookBuddy · <a href="${SITE}" style="color:#6b7280">ebookbuddy.org</a> · Questions? Just reply to this email.`,
  es: `eBookBuddy · <a href="${SITE}" style="color:#6b7280">ebookbuddy.org</a> · ¿Preguntas? Responda a este correo.`,
};

const greeting = (lang: Lang, name: string | null) => {
  const n = name?.trim() ? `, ${esc(name.trim())}` : "";
  return lang === "es" ? `Hola${n}:` : `Hi${n},`;
};

const registrationReceived = (lang: Lang, guardianName: string | null) =>
  lang === "es"
    ? {
        subject: "Recibimos su inscripción en eBookBuddy",
        paragraphs: [
          greeting(lang, guardianName),
          "¡Gracias por inscribir a su hijo/a en eBookBuddy! Recibimos su solicitud.",
          "Nuestro equipo la revisará y le enviaremos un correo cuando tengamos una respuesta.",
        ],
      }
    : {
        subject: "We received your eBookBuddy registration",
        paragraphs: [
          greeting(lang, guardianName),
          "Thank you for registering your child with eBookBuddy! We've received your application.",
          "Our team will review it and email you as soon as there's an update.",
        ],
      };

const registrationDecision = (lang: Lang, guardianName: string | null, approved: boolean) => {
  if (lang === "es") {
    return approved
      ? {
          subject: "¡Su inscripción en eBookBuddy fue aprobada!",
          paragraphs: [
            greeting(lang, guardianName),
            "¡Buenas noticias! La inscripción de su hijo/a en eBookBuddy fue aprobada.",
            "Nos pondremos en contacto pronto con los próximos pasos para comenzar las sesiones de lectura.",
          ],
        }
      : {
          subject: "Actualización sobre su inscripción en eBookBuddy",
          paragraphs: [
            greeting(lang, guardianName),
            "Gracias por su interés en eBookBuddy. En este momento no podemos aceptar la inscripción de su hijo/a.",
            "Si tiene preguntas, responda a este correo y con gusto le ayudaremos.",
          ],
        };
  }
  return approved
    ? {
        subject: "Your eBookBuddy registration is approved!",
        paragraphs: [
          greeting(lang, guardianName),
          "Good news! Your child's eBookBuddy registration has been approved.",
          "We'll be in touch soon with the next steps for starting reading sessions.",
        ],
      }
    : {
        subject: "An update on your eBookBuddy registration",
        paragraphs: [
          greeting(lang, guardianName),
          "Thank you for your interest in eBookBuddy. Unfortunately, we aren't able to accept your child's registration at this time.",
          "If you have any questions, just reply to this email and we'll be glad to help.",
        ],
      };
};

const volunteerVerified = (name: string | null) => ({
  subject: "You're verified as an eBookBuddy volunteer!",
  paragraphs: [
    greeting("en", name),
    "Thank you for volunteering! Your eBookBuddy volunteer account is now verified.",
    `To join a reading session, sign in at <a href="${SITE}">ebookbuddy.org</a>, open your dashboard, and click <strong>Online Meeting Room</strong>.`,
    "If the button isn't available yet, an administrator still needs to assign you to a meeting room. We'll let you know.",
  ],
});

const adminNewRegistration = () => ({
  subject: "New student registration on eBookBuddy",
  paragraphs: [
    "A new student registration was just submitted.",
    `Review it in <a href="${SITE}/admin">Admin → Registrations</a>.`,
  ],
});

const toText = (paragraphs: string[]) => paragraphs.map((p) => p.replace(/<[^>]+>/g, "")).join("\n\n");

const sendEmail = async (to: string, mail: { subject: string; paragraphs: string[] }, lang: Lang) => {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject: mail.subject,
      html: layout(mail.paragraphs, FOOTER[lang]),
      text: `${toText(mail.paragraphs)}\n\n--\neBookBuddy · ${SITE}`,
    }),
  });
  // Log status only: never log recipients or names.
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
};

/** The registration form stores the language the guardian used in the notes JSON. */
const languageOf = (notes: string | null): Lang => {
  try {
    return JSON.parse(notes ?? "{}")?.language === "es" ? "es" : "en";
  } catch {
    return "en";
  }
};

const isEmail = (s: unknown): s is string => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!Deno.env.get("RESEND_API_KEY")) return json({ error: "Email is not set up yet." }, 503);

    const body = await req.json().catch(() => ({}));
    const type = String(body?.type ?? "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Public: the registration form calls this right after inserting. Only a fresh,
    // not-yet-confirmed registration for that address gets one email, ever.
    if (type === "registration_received") {
      const email = String(body?.guardian_email ?? "").trim();
      if (!isEmail(email)) return json({ error: "Invalid request." }, 400);
      const since = new Date(Date.now() - CONFIRMATION_WINDOW_MINUTES * 60_000).toISOString();
      const { data: reg } = await admin
        .from("registrations")
        .select("id, guardian_name, notes")
        .eq("guardian_email", email)
        .eq("status", "pending")
        .is("confirmation_emailed_at", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!reg) return json({ ok: true, sent: false });

      // Claim it: only the call whose conditional update succeeds sends the email.
      const { data: claimed } = await admin
        .from("registrations")
        .update({ confirmation_emailed_at: new Date().toISOString() })
        .eq("id", reg.id)
        .is("confirmation_emailed_at", null)
        .select("id")
        .maybeSingle();
      if (!claimed) return json({ ok: true, sent: false });

      const lang = languageOf(reg.notes);
      await sendEmail(email, registrationReceived(lang, reg.guardian_name), lang);
      await sendEmail(ADMIN_INBOX, adminNewRegistration(), "en").catch((e) => console.error("send-email admin notice", String(e)));
      return json({ ok: true, sent: true });
    }

    // Admin-only actions: verify the caller the same way assess-pronunciation does.
    const auth = req.headers.get("Authorization") ?? "";
    const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await uc.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (isAdmin !== true) return json({ error: "Not permitted." }, 403);

    if (type === "registration_decision") {
      const { data: reg } = await admin
        .from("registrations")
        .select("guardian_email, guardian_name, status, notes")
        .eq("id", String(body?.registration_id ?? ""))
        .maybeSingle();
      if (!reg || !isEmail(reg.guardian_email)) return json({ ok: true, sent: false });
      if (reg.status !== "approved" && reg.status !== "rejected") return json({ ok: true, sent: false });
      const lang = languageOf(reg.notes);
      await sendEmail(reg.guardian_email, registrationDecision(lang, reg.guardian_name, reg.status === "approved"), lang);
      return json({ ok: true, sent: true });
    }

    if (type === "volunteer_verified") {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name, is_verified")
        .eq("user_id", String(body?.user_id ?? ""))
        .maybeSingle();
      if (!profile?.is_verified || !isEmail(profile.email)) return json({ ok: true, sent: false });
      await sendEmail(profile.email, volunteerVerified(profile.full_name), "en");
      return json({ ok: true, sent: true });
    }

    return json({ error: "Unknown email type." }, 400);
  } catch (e) {
    console.error("send-email", String(e));
    return json({ error: "We couldn't send that email." }, 500);
  }
});
