import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  ANSWER_FIELD_TYPES, DEFAULT_EMAILS, EMAIL_PURPOSES, NAME_FALLBACK, SITE_URL, answerText, fillFields,
  formFieldKey, htmlToText, renderEmail, studentFieldValues,
  type EmailLanguage, type EmailLayout, type EmailPurpose,
} from "../_shared/email.ts";

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
// The public form may only trigger a confirmation for a registration this fresh.
const CONFIRMATION_WINDOW_MINUTES = 15;

type Lang = EmailLanguage;
type Db = ReturnType<typeof createClient>;

/** Who an email is about, used to find their answers to custom forms. */
type Person = { userId?: string | null; email?: string | null };

/**
 * Values for {{form.<form>.<field>}} placeholders: the person's most recent answers to
 * each custom form (Settings → Forms/Link), matched by their account or by their email
 * address appearing among the answers.
 */
const formFieldValues = async (db: Db, person: Person, lang: Lang) => {
  const values: Record<string, string> = {};
  const email = person.email?.trim().toLowerCase();
  if (!person.userId && !email) return values;

  const { data: forms } = await db.from("forms").select("id, slug, fields");
  const { data: submissions } = await db
    .from("form_submissions")
    .select("form_id, user_id, data")
    .order("created_at", { ascending: false })
    .limit(2000);

  const isTheirs = (sub: { user_id: string | null; data: unknown }) => {
    if (person.userId && sub.user_id === person.userId) return true;
    if (!email || !sub.data || typeof sub.data !== "object") return false;
    return Object.values(sub.data as Record<string, unknown>).some(
      (v) => typeof v === "string" && v.trim().toLowerCase() === email,
    );
  };

  for (const form of forms ?? []) {
    const latest = (submissions ?? []).find((s) => s.form_id === form.id && isTheirs(s));
    if (!latest) continue;
    const answers = (latest.data ?? {}) as Record<string, unknown>;
    const fields = Array.isArray(form.fields) ? (form.fields as { name?: string; type?: string }[]) : [];
    for (const f of fields) {
      if (!f?.name || !ANSWER_FIELD_TYPES.includes(String(f.type))) continue;
      values[formFieldKey(form.slug || form.id, f.name)] = answerText(answers[f.name], lang);
    }
  }
  return values;
};

/**
 * Builds the email for a purpose: the admin's saved template (Settings → Emails) for
 * that purpose and language if there is one, otherwise the built-in wording. Fields
 * without a value are left blank.
 */
const composeEmail = async (db: Db, purpose: EmailPurpose, lang: Lang, values: Record<string, string>, person: Person = {}) => {
  const englishOnly = EMAIL_PURPOSES.find((p) => p.id === purpose)?.englishOnly;
  const language: Lang = englishOnly ? "en" : lang;
  const { data: saved } = await db
    .from("email_templates")
    .select("subject, body_html, layout")
    .eq("purpose", purpose)
    .eq("language", language)
    .maybeSingle();
  const fallback = DEFAULT_EMAILS[purpose][language] ?? DEFAULT_EMAILS[purpose].en;
  const subject = saved?.subject?.trim() ? saved.subject : fallback.subject;
  const bodyTemplate = saved?.body_html?.trim() ? saved.body_html : fallback.body;
  const layout = (saved?.layout ?? "classic") as EmailLayout;

  // Only look up form answers when the email actually uses a form field.
  const usesForms = `${subject}${bodyTemplate}`.includes("{{form.");
  const filled = {
    ...(usesForms ? await formFieldValues(db, person, language) : {}),
    site_link: SITE_URL,
    admin_link: `${SITE_URL}/admin`,
    ...values,
  };
  const body = fillFields(bodyTemplate, filled, false, true);
  return {
    subject: fillFields(subject, filled, true, true),
    html: renderEmail(layout, body, language),
    text: `${htmlToText(body)}

--
eBookBuddy · ${SITE_URL}`,
  };
};

const sendEmail = async (to: string, mail: { subject: string; html: string; text: string }) => {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, ...mail }),
  });
  // Log status only: never log recipients or names.
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
};

const nameOr = (name: string | null | undefined, lang: Lang) => name?.trim() || NAME_FALLBACK[lang];

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
        .select("id, user_id, guardian_name, guardian_email, guardian_phone, school_name, grade_level, notes")
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
      const person = { userId: reg.user_id, email };
      const student = studentFieldValues(reg, lang);
      await sendEmail(email, await composeEmail(admin, "registration_received", lang, { ...student, guardian_name: nameOr(reg.guardian_name, lang) }, person));
      await composeEmail(admin, "admin_new_registration", "en", studentFieldValues(reg, "en"), person)
        .then((mail) => sendEmail(ADMIN_INBOX, mail))
        .catch((e) => console.error("send-email admin notice", String(e)));
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
        .select("user_id, guardian_email, guardian_name, guardian_phone, school_name, grade_level, status, notes")
        .eq("id", String(body?.registration_id ?? ""))
        .maybeSingle();
      if (!reg || !isEmail(reg.guardian_email)) return json({ ok: true, sent: false });
      if (reg.status !== "approved" && reg.status !== "rejected") return json({ ok: true, sent: false });
      const lang = languageOf(reg.notes);
      const purpose = reg.status === "approved" ? "registration_approved" : "registration_rejected";
      const values = { ...studentFieldValues(reg, lang), guardian_name: nameOr(reg.guardian_name, lang) };
      await sendEmail(reg.guardian_email, await composeEmail(admin, purpose, lang, values, { userId: reg.user_id, email: reg.guardian_email }));
      return json({ ok: true, sent: true });
    }

    if (type === "volunteer_verified") {
      const { data: profile } = await admin
        .from("profiles")
        .select("user_id, email, full_name, is_verified")
        .eq("user_id", String(body?.user_id ?? ""))
        .maybeSingle();
      if (!profile?.is_verified || !isEmail(profile.email)) return json({ ok: true, sent: false });
      const values = { volunteer_name: nameOr(profile.full_name, "en"), volunteer_email: profile.email };
      await sendEmail(profile.email, await composeEmail(admin, "volunteer_verified", "en", values, { userId: profile.user_id, email: profile.email }));
      return json({ ok: true, sent: true });
    }

    return json({ error: "Unknown email type." }, 400);
  } catch (e) {
    console.error("send-email", String(e));
    return json({ error: "We couldn't send that email." }, 500);
  }
});
