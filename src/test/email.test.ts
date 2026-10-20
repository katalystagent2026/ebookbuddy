import { describe, expect, it } from 'vitest';
import {
  answerText, fillFields, formFieldKey, htmlToText, studentFieldValues,
} from '../../supabase/functions/_shared/email';

describe('fillFields', () => {
  it('fills built-in and custom form placeholders, escaping HTML', () => {
    const html = '<p>Hi {{guardian_name}}, phone {{ form.volunteer.phone }}</p>';
    const out = fillFields(html, { guardian_name: 'A & B', [formFieldKey('volunteer', 'phone')]: '555' });
    expect(out).toBe('<p>Hi A &amp; B, phone 555</p>');
  });

  it('keeps unknown placeholders for the preview but blanks them when sending', () => {
    expect(fillFields('Hi {{student_name}}', {})).toBe('Hi {{student_name}}');
    expect(fillFields('Hi {{student_name}}!', {}, false, true)).toBe('Hi !');
  });

  it('does not escape the subject line and removes line breaks', () => {
    expect(fillFields('For {{guardian_name}}', { guardian_name: 'O\'Neil\nX' }, true)).toBe("For O'Neil X");
  });
});

describe('studentFieldValues', () => {
  const reg = {
    guardian_name: 'Alex',
    guardian_email: 'a@example.com',
    guardian_phone: '555',
    school_name: 'Oak',
    grade_level: '3rd',
    notes: JSON.stringify({ student_name: 'Sam', gender: 'female', availability: 'mon-wed-7-730', language: 'es' }),
  };

  it('turns coded answers into words in the email language', () => {
    expect(studentFieldValues(reg, 'en')).toMatchObject({ student_name: 'Sam', gender: 'Female', availability: 'Mon/Wed 7:00 – 7:30 PM' });
    expect(studentFieldValues(reg, 'es')).toMatchObject({ gender: 'Femenino', availability: 'Lun/Mié 7:00 – 7:30 PM' });
  });

  it('copes with notes that are not JSON', () => {
    expect(studentFieldValues({ ...reg, notes: 'free text' }, 'en')).toMatchObject({ student_name: '', grade: '3rd' });
  });
});

describe('answerText', () => {
  it('formats checkbox, list and empty answers', () => {
    expect(answerText(true, 'en')).toBe('Yes');
    expect(answerText(true, 'es')).toBe('Sí');
    expect(answerText(['a', 'b'], 'en')).toBe('a, b');
    expect(answerText(undefined, 'en')).toBe('');
  });
});

describe('htmlToText', () => {
  it('keeps link addresses and list bullets', () => {
    expect(htmlToText('<p>Go <a href="https://x.org">here</a></p><ul><li>One</li></ul>')).toBe('Go here (https://x.org)\n\n• One');
  });
});
