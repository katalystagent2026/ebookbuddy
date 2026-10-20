import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, Link2, ImagePlus, Minus, Undo2, Redo2, Braces, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/** A group in the "Insert field" menu (Student Registration, a custom form, …). */
export interface FieldMenuGroup {
  id: string;
  label: string;
  fields: { key: string; label: string }[];
  /** Shown instead of the fields when this group can't be filled for the current email. */
  disabledReason?: string;
}

const EMAIL_IMAGES_BUCKET = 'email-images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Email images stay in old emails for years; links expire after about 10 years. */
const IMAGE_LINK_SECONDS = 10 * 365 * 24 * 60 * 60;

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** {{field}} placeholders offered by "Insert field", grouped by where the data comes from. */
  fieldGroups: FieldMenuGroup[];
}

const ToolButton = ({
  label, active, disabled, onClick, children,
}: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        className={cn('h-8 w-8', active && 'bg-accent text-accent-foreground')}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const Divider = () => <span className="mx-1 h-6 w-px bg-border" aria-hidden />;

const LinkButton = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const apply = () => {
    const href = url.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!href) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|mailto:)/i.test(href) ? href : `https://${href}` }).run();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setUrl(editor.getAttributes('link').href ?? '');
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Link"
          className={cn('h-8 w-8', editor.isActive('link') && 'bg-accent text-accent-foreground')}
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2">
        <p className="text-sm font-medium">Link address</p>
        <Input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), apply())}
          placeholder="https://ebookbuddy.org"
        />
        <div className="flex justify-end gap-2">
          {editor.isActive('link') && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setUrl(''); editor.chain().focus().unsetLink().run(); setOpen(false); }}>
              Remove link
            </Button>
          )}
          <Button type="button" size="sm" onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function RichTextEditor({ value, onChange, fieldGroups }: RichTextEditorProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Write your email…' }),
    ],
    content: value,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[280px] px-4 py-3 focus:outline-none [&_img]:rounded-lg [&_img]:max-w-full',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  // Content replaced from outside (AI suggestion accepted, "start from current wording").
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  const uploadImage = async (file: File) => {
    if (!editor) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please choose an image file', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: 'Image is too large', description: 'Please use an image under 5 MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(EMAIL_IMAGES_BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      // The workspace doesn't allow public buckets, so use a long-lived signed link that
      // mail apps can load without signing in.
      const { data, error: linkError } = await supabase.storage
        .from(EMAIL_IMAGES_BUCKET)
        .createSignedUrl(path, IMAGE_LINK_SECONDS);
      if (linkError || !data?.signedUrl) throw linkError ?? new Error('Could not create image link');
      editor.chain().focus().setImage({ src: data.signedUrl, alt: '' }).run();
    } catch (err) {
      toast({ title: 'Image upload failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <ToolButton label="Undo" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}><Undo2 className="h-4 w-4" /></ToolButton>
        <ToolButton label="Redo" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}><Redo2 className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolButton>
        <ToolButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
        <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
        <ToolButton label="Underline" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}><Underline className="h-4 w-4" /></ToolButton>
        <ToolButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolButton>
        <LinkButton editor={editor} />
        <Divider />
        <ToolButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
        <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
        <ToolButton label="Quote" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolButton>
        <ToolButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></ToolButton>
        <ToolButton label="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></ToolButton>
        <ToolButton label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton label="Insert image" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </ToolButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) uploadImage(file);
          }}
        />
        {fieldGroups.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1">
                <Braces className="h-4 w-4" />
                Insert field
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Filled in when the email is sent
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {fieldGroups.map((group) => (
                <DropdownMenuSub key={group.id}>
                  <DropdownMenuSubTrigger className={cn(group.disabledReason && 'text-muted-foreground')}>
                    <span className="truncate">{group.label}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 w-72 overflow-y-auto">
                    {group.disabledReason ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">{group.disabledReason}</p>
                    ) : group.fields.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">This form has no answer fields yet.</p>
                    ) : (
                      group.fields.map((f) => (
                        <DropdownMenuItem key={f.key} onSelect={() => chain().insertContent(`{{${f.key}}}`).run()}>
                          {f.label}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
