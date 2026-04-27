import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'Beliebt': ['😀', '😊', '😍', '🥰', '😘', '🤗', '😎', '🤩', '🥳', '😇', '🎉', '❤️', '🔥', '💯', '👍', '👏', '🙌', '✨', '⭐', '🌟', '💪', '🎁', '👋', '🙏', '💕', '😂', '🤣', '😉', '💖', '🏆'],
  'Gesichter': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬'],
  'Essen & Trinken': ['☕', '🍕', '🍔', '🥗', '🍰', '🎂', '🍦', '🥐', '🍪', '🥤', '🍺', '🍷', '🍣', '🍜', '🍩', '🧁', '🥧', '🍫', '🍬', '🍭', '🧇', '🥞', '🧀', '🥩', '🍗', '🥘', '🍝', '🍲', '🥡', '🍱', '🫕', '🥙', '🧆', '🌮', '🌯', '🫔', '🥪', '🍟', '🍿', '🧈'],
  'Geschäft': ['💇', '💅', '🏠', '🛒', '📦', '🚀', '💰', '🎯', '📱', '💼', '🏪', '🛍️', '💳', '🎀', '🏆', '📊', '💡', '🔔', '📌', '🗓️', '✅', '📋', '🤝', '💵', '🏷️', '📈', '🎪', '🛎️', '🧾', '🔑', '📣', '📢', '🪧', '💎', '🎖️', '🥇', '🥈', '🥉', '🏅', '🎗️'],
  'Natur & Wetter': ['🌸', '🌺', '🌻', '🌷', '🌹', '🍀', '🌈', '☀️', '🌙', '⭐', '🌊', '🌿', '🍃', '🌴', '🌵', '🌾', '🍁', '🍂', '🌲', '🏔️', '🌅', '🌄', '☁️', '❄️', '⛈️', '🌪️', '🦋', '🐝', '🌼', '🪻', '🍄', '🐚', '🌍', '🌎', '🌏', '💧', '🫧', '🪸', '🐬', '🦜'],
  'Feiern': ['🎉', '🎊', '🎈', '🎁', '🎂', '🥂', '🍾', '🎆', '🎇', '🪅', '🎏', '🎀', '🎗️', '🎟️', '🏅', '🥇', '🏆', '🎖️', '🎃', '🎄', '❤️‍🔥', '💝', '💐', '🌠', '🎵', '🎶', '🎤', '🎸', '🥁', '🎺', '🎷', '🪩', '🎭', '🎬', '🧨', '🪄', '✨', '🌟', '💫', '⚡'],
  'Herzen & Liebe': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💝', '💘', '💌', '🫶', '😍', '🥰', '😘', '💋', '💑', '💏', '🌹', '💐', '🥀'],
  'Gesten': ['👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🖐️', '✋', '👌', '🫰', '💪', '🫵', '☝️', '👆', '👇', '👈', '👉', '🫶', '✊', '👊', '🤜', '🤛', '🫱', '🫲'],
  'Symbole': ['✅', '❌', '⚡', '💫', '🔔', '📍', '🎵', '💎', '🔑', '📌', '✏️', '📝', '💡', '🎨', '🎪', '♻️', '⚠️', '🔒', '🔓', '💬', '🏁', '🚩', '🔗', '📎', '🧲', '🎲', '♟️', '🧩', '🔮', '🪄', '🫧', '💠', '🔷', '🔶', '🟢', '🟡', '🔴', '🟣', '⭕', '💯'],
  'Tiere': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🦋', '🐌'],
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

  const handleEmojiSelect = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmoji(false);
  };

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-t-xl border border-b-0 border-slate-300">
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
          <PopoverContent className="w-[340px] p-3" align="start">
            <div className="flex gap-1 mb-2 flex-wrap">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  variant={emojiCategory === cat ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEmojiCategory(cat as keyof typeof EMOJI_CATEGORIES)}
                  className="h-6 text-[10px] px-1.5"
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-10 gap-0.5 max-h-[200px] overflow-y-auto">
              {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
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
        className="rounded-t-none rounded-b-xl border-t-0 resize-none bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 placeholder:text-slate-400"
      />
    </div>
  );
};

export default RichTextEditor;
