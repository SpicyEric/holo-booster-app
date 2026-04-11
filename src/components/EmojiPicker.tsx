import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊',
  '😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪',
  '😎','🤗','🤔','🤫','🤭','😐','😑','😶','😏','😒',
  '🙄','😬','😮','😯','😲','😳','🥺','😢','😭','😤',
  '😡','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺',
  '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞',
  '🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎',
  '👏','🙌','🤝','🙏','💪','🦾','🦿','🦵','🦶','👀',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
  '❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️',
  '⭐','🌟','✨','💫','🔥','💥','🎉','🎊','🎁','🎂',
  '🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎯','🎪',
  '📬','📩','📨','📧','💌','📮','📪','📫','📭','📦',
  '🔔','🔕','📢','📣','💬','💭','🗯️','💡','🔑','🗝️',
  '☕','🍺','🍕','🍔','🍟','🌮','🍿','🎂','🍰','🧁',
  '🍩','🍪','🍫','🍬','🍭','🍮','🍯','🥤','🧃','🍷',
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-muted">
          <Smile className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start" side="bottom">
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {EMOJI_LIST.map((emoji, i) => (
            <button
              key={i}
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg cursor-pointer transition-colors"
              onClick={() => { onEmojiSelect(emoji); setOpen(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;