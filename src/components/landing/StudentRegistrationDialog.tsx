import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Globe } from 'lucide-react';

const translations = {
  en: {
    title: '📚 Interested in Online Reading',
    description: 'Register your child for our online reading program.',
    studentName: "Student's Name",
    grade: 'Grade',
    gender: 'Gender',
    schoolName: 'School Name',
    parentName: "Parent's Name",
    parentMobile: "Parent's Mobile",
    parentEmail: "Parent's Email",
    availability: 'Availability',
    selectGrade: 'Select grade',
    selectGender: 'Select gender',
    selectTimeSlot: 'Select time slot',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    preferNotToSay: 'Prefer not to say',
    acknowledgement: 'We participate voluntarily in the online reading program and will make efforts to get our child on time to each reading session. We understand ebookbuddy.org Catalyst Coalition organization, leadership or volunteers does not take any liability for the online session.',
    submit: 'Submit Registration',
    submitting: 'Submitting...',
    enterStudentName: "Enter student's full name",
    enterSchoolName: 'Enter school name',
    enterParentName: "Enter parent's full name",
    phonePlaceholder: '(555) 123-4567',
    emailPlaceholder: 'parent@email.com',
    acceptAck: 'Please accept the acknowledgement',
    fillRequired: 'Please fill in all required fields',
    successTitle: 'Registration submitted!',
    successDesc: 'Your registration is pending approval.',
    failTitle: 'Registration failed',
  },
  es: {
    title: '📚 ¿Interesado en Lectura en Línea?',
    description: 'Registre a su hijo/a en nuestro programa de lectura en línea.',
    studentName: 'Nombre del Estudiante',
    grade: 'Grado',
    gender: 'Género',
    schoolName: 'Nombre de la Escuela',
    parentName: 'Nombre del Padre/Madre',
    parentMobile: 'Teléfono del Padre/Madre',
    parentEmail: 'Correo del Padre/Madre',
    availability: 'Disponibilidad',
    selectGrade: 'Seleccionar grado',
    selectGender: 'Seleccionar género',
    selectTimeSlot: 'Seleccionar horario',
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro',
    preferNotToSay: 'Prefiero no decir',
    acknowledgement: 'Participamos voluntariamente en el programa de lectura en línea y haremos esfuerzos para que nuestro hijo/a llegue a tiempo a cada sesión de lectura. Entendemos que la organización ebookbuddy.org Catalyst Coalition, su liderazgo o voluntarios no asumen ninguna responsabilidad por la sesión en línea.',
    submit: 'Enviar Registro',
    submitting: 'Enviando...',
    enterStudentName: 'Ingrese el nombre completo del estudiante',
    enterSchoolName: 'Ingrese el nombre de la escuela',
    enterParentName: 'Ingrese el nombre completo del padre/madre',
    phonePlaceholder: '(555) 123-4567',
    emailPlaceholder: 'padre@correo.com',
    acceptAck: 'Por favor acepte el reconocimiento',
    fillRequired: 'Por favor complete todos los campos requeridos',
    successTitle: '¡Registro enviado!',
    successDesc: 'Su registro está pendiente de aprobación.',
    failTitle: 'Error en el registro',
  },
} as const;

type Lang = keyof typeof translations;

interface StudentRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentRegistrationDialog({ open, onOpenChange }: StudentRegistrationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const t = translations[lang];
  const [form, setForm] = useState({
    studentName: '',
    grade: '',
    gender: '',
    schoolName: '',
    parentName: '',
    parentMobile: '',
    parentEmail: '',
    availability: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acknowledged) {
      toast({ title: t.acceptAck, variant: 'destructive' });
      return;
    }

    if (!form.studentName || !form.grade || !form.gender || !form.parentName || !form.parentMobile || !form.parentEmail || !form.availability) {
      toast({ title: t.fillRequired, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('registrations').insert({
        registration_type: 'student',
        guardian_name: form.parentName,
        guardian_email: form.parentEmail,
        guardian_phone: form.parentMobile,
        school_name: form.schoolName,
        grade_level: form.grade,
        notes: JSON.stringify({
          student_name: form.studentName,
          gender: form.gender,
          availability: form.availability,
        }),
        status: 'pending',
      });

      if (error) throw error;

      toast({ title: t.successTitle, description: t.successDesc });
      onOpenChange(false);
      setForm({ studentName: '', grade: '', gender: '', schoolName: '', parentName: '', parentMobile: '', parentEmail: '', availability: '' });
      setAcknowledged(false);
    } catch (err: any) {
      toast({ title: t.failTitle, description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-2xl font-heading">{t.title}</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="shrink-0 gap-1.5 text-xs"
            >
              <Globe className="w-4 h-4" />
              {lang === 'en' ? 'Español' : 'English'}
            </Button>
          </div>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="studentName">{t.studentName} *</Label>
            <Input id="studentName" value={form.studentName} onChange={e => handleChange('studentName', e.target.value)} placeholder={t.enterStudentName} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.grade} *</Label>
              <Select value={form.grade} onValueChange={v => handleChange('grade', v)}>
                <SelectTrigger><SelectValue placeholder={t.selectGrade} /></SelectTrigger>
                <SelectContent>
                  {['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.gender} *</Label>
              <Select value={form.gender} onValueChange={v => handleChange('gender', v)}>
                <SelectTrigger><SelectValue placeholder={t.selectGender} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t.male}</SelectItem>
                  <SelectItem value="female">{t.female}</SelectItem>
                  <SelectItem value="other">{t.other}</SelectItem>
                  <SelectItem value="prefer-not-to-say">{t.preferNotToSay}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolName">{t.schoolName}</Label>
            <Input id="schoolName" value={form.schoolName} onChange={e => handleChange('schoolName', e.target.value)} placeholder={t.enterSchoolName} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentName">{t.parentName} *</Label>
            <Input id="parentName" value={form.parentName} onChange={e => handleChange('parentName', e.target.value)} placeholder={t.enterParentName} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentMobile">{t.parentMobile} *</Label>
              <Input id="parentMobile" type="tel" value={form.parentMobile} onChange={e => handleChange('parentMobile', e.target.value)} placeholder={t.phonePlaceholder} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentEmail">{t.parentEmail} *</Label>
              <Input id="parentEmail" type="email" value={form.parentEmail} onChange={e => handleChange('parentEmail', e.target.value)} placeholder={t.emailPlaceholder} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.availability} *</Label>
            <Select value={form.availability} onValueChange={v => handleChange('availability', v)}>
              <SelectTrigger><SelectValue placeholder={t.selectTimeSlot} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mon-wed-7-730">Mon/Wed 7:00 – 7:30 PM</SelectItem>
                <SelectItem value="mon-wed-730-8">Mon/Wed 7:30 – 8:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/50">
            <Checkbox id="acknowledge" checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} className="mt-1" />
            <Label htmlFor="acknowledge" className="text-sm leading-relaxed font-normal cursor-pointer">
              {t.acknowledgement}
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.submitting : t.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
