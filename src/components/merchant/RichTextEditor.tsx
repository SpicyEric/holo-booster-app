import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bold, Smile } from 'lucide-react';

const EMOJIS = [
  '😀', '😊', '🎉', '❤️', '👍', '🌟', '✨', '🔥', '💯', '🎁',
  '☕', '🍕', '🍔', '🥗', '🍰', '🎂', '🍦', '🥐', '🍪', '🥤',
  '💇', '💅', '🏠', '🛒', '📦', '🚀', '💰', '🎯', '📱', '💼'
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const RichTextEditor = ({ value, onChange, placeholder, rows = 3 }: RichTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

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

    // Restore cursor position after insert
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
    }
  };

  const handleBold = () => {
    wrapSelection('**', '**');
  };

  const handleEmojiSelect = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmoji(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-t-xl border border-b-0 border-gray-200">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          className="h-7 px-2 text-xs rounded-lg hover:bg-gray-200"
          title="Fett (Text markieren)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Popover open={showEmoji} onOpenChange={setShowEmoji}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs rounded-lg hover:bg-gray-200"
              title="Emoji einfügen"
            >
              <Smile className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-lg hover:bg-gray-100 rounded p-1 transition-colors"
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
        className="rounded-t-none rounded-b-xl border-t-0"
      />
      <p className="text-xs text-muted-foreground">
        Tipp: Text markieren und Fett-Button klicken für **fett**. Zeilenumbrüche werden übernommen.
      </p>
    </div>
  );
};

export default RichTextEditor;
