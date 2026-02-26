import { useI18n, langLabels, Lang } from '@/lib/i18n';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const langs: Lang[] = ['en', 'es', 'ko'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Globe className="w-4 h-4" />
          {langLabels[lang]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {langs.map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLang(l)} className={l === lang ? 'font-bold' : ''}>
            {langLabels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
