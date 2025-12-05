import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bold, Italic, Smile } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'Beliebt': ['😀', '😊', '🎉', '❤️', '👍', '🌟', '✨', '🔥', '💯', '🎁', '👋', '🙏', '💪', '🥳', '😍'],
  'Essen & Trinken': ['☕', '🍕', '🍔', '🥗', '🍰', '🎂', '🍦', '🥐', '🍪', '🥤', '🍺', '🍷', '🍣', '🍜', '🍩'],
  'Geschäft': ['💇', '💅', '🏠', '🛒', '📦', '🚀', '💰', '🎯', '📱', '💼', '🏪', '🛍️', '💳', '🎀', '🏆'],
  'Natur': ['🌸', '🌺', '🌻', '🌷', '🌹', '🍀', '🌈', '☀️', '🌙', '⭐', '🌊', '🌿', '🍃', '🌴', '🌵'],
  'Symbole': ['✅', '❌', '⚡', '💫', '🔔', '📍', '🎵', '💎', '🔑', '📌', '✏️', '📝', '💡', '🎨', '🎪']
};

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const RichTextEditor = ({ value, onChange, placeholder, rows = 3 }: RichTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Beliebt');

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + text);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      const newValue = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    } else {
      // Insert placeholder if nothing selected
      const placeholder = prefix === '**' ? 'fetter Text' : 'kursiver Text';
      const newValue = value.substring(0, start) + prefix + placeholder + suffix + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
      }, 0);
    }
  };

  const handleBold = () => wrapSelection('**', '**');
  const handleItalic = () => wrapSelection('_', '_');

  const handleEmojiSelect = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmoji(false);
  };

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-1 p-1.5 bg-gray-100 rounded-t-xl border border-b-0 border-gray-200">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          className="h-8 px-3 text-xs rounded-lg hover:bg-gray-200 font-bold"
          title="Fett (Text markieren)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleItalic}
          className="h-8 px-3 text-xs rounded-lg hover:bg-gray-200 italic"
          title="Kursiv (Text markieren)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <Popover open={showEmoji} onOpenChange={setShowEmoji}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs rounded-lg hover:bg-gray-200"
              title="Emoji einfügen"
            >
              <Smile className="h-4 w-4 mr-1" />
              Emoji
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="flex gap-1 mb-2 flex-wrap">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  variant={emojiCategory === cat ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEmojiCategory(cat as keyof typeof EMOJI_CATEGORIES)}
                  className="h-6 text-xs px-2"
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-xl hover:bg-gray-100 rounded p-1.5 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="rounded-t-none rounded-b-xl border-t-0 resize-none"
      />
      <p className="text-xs text-muted-foreground mt-1.5">
        💡 Text markieren → Fett/Kursiv klicken. Zeilenumbrüche werden übernommen.
      </p>
    </div>
  );
};

export default RichTextEditor;
