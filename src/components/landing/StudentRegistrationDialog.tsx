import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudentRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentRegistrationDialog({ open, onOpenChange }: StudentRegistrationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
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
      toast({ title: 'Please accept the acknowledgement', variant: 'destructive' });
      return;
    }

    if (!form.studentName || !form.grade || !form.gender || !form.parentName || !form.parentMobile || !form.parentEmail || !form.availability) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
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

      toast({ title: 'Registration submitted!', description: 'Your registration is pending approval.' });
      onOpenChange(false);
      setForm({ studentName: '', grade: '', gender: '', schoolName: '', parentName: '', parentMobile: '', parentEmail: '', availability: '' });
      setAcknowledged(false);
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">🌟 Student Space Open</DialogTitle>
          <DialogDescription>Register your child for our online reading program.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="studentName">Student's Name *</Label>
            <Input id="studentName" value={form.studentName} onChange={e => handleChange('studentName', e.target.value)} placeholder="Enter student's full name" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grade *</Label>
              <Select value={form.grade} onValueChange={v => handleChange('grade', v)}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={form.gender} onValueChange={v => handleChange('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolName">School Name</Label>
            <Input id="schoolName" value={form.schoolName} onChange={e => handleChange('schoolName', e.target.value)} placeholder="Enter school name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentName">Parent's Name *</Label>
            <Input id="parentName" value={form.parentName} onChange={e => handleChange('parentName', e.target.value)} placeholder="Enter parent's full name" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentMobile">Parent's Mobile *</Label>
              <Input id="parentMobile" type="tel" value={form.parentMobile} onChange={e => handleChange('parentMobile', e.target.value)} placeholder="(555) 123-4567" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent's Email *</Label>
              <Input id="parentEmail" type="email" value={form.parentEmail} onChange={e => handleChange('parentEmail', e.target.value)} placeholder="parent@email.com" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Availability *</Label>
            <Select value={form.availability} onValueChange={v => handleChange('availability', v)}>
              <SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mon-wed-7-730">Mon/Wed 7:00 – 7:30 PM</SelectItem>
                <SelectItem value="mon-wed-730-8">Mon/Wed 7:30 – 8:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/50">
            <Checkbox id="acknowledge" checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} className="mt-1" />
            <Label htmlFor="acknowledge" className="text-sm leading-relaxed font-normal cursor-pointer">
              We participate voluntarily in the online reading program and will make efforts to get our child on time to each reading session. We understand ebookbuddy.org Catalyst Coalition organization, leadership or volunteers does not take any liability for the online session.
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Registration'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
