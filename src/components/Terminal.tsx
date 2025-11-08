import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Terminal as TerminalIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TerminalProps {
  onClose: () => void;
}

interface CommandOutput {
  command: string;
  output: string;
  timestamp: number;
}

export function Terminal({ onClose }: TerminalProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandOutput[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    setCommandHistory((prev) => [...prev, trimmedCmd]);
    setHistoryIndex(-1);

    let output = '';

    if (trimmedCmd === 'clear') {
      setHistory([]);
      return;
    }

    if (trimmedCmd === 'help') {
      output = `Available commands:
  help       - Show this help message
  clear      - Clear terminal
  echo <msg> - Echo a message
  ls         - List files (simulated)
  pwd        - Print working directory
  date       - Show current date/time

Note: This is a simulated terminal. Real command execution would require a backend.`;
    } else if (trimmedCmd.startsWith('echo ')) {
      output = trimmedCmd.substring(5);
    } else if (trimmedCmd === 'ls') {
      output = 'project/\n  index.html\n  styles.css\n  app.ts';
    } else if (trimmedCmd === 'pwd') {
      output = '/project';
    } else if (trimmedCmd === 'date') {
      output = new Date().toString();
    } else {
      output = `Command not found: ${trimmedCmd}\nType 'help' for available commands.`;
    }

    setHistory((prev) => [
      ...prev,
      {
        command: trimmedCmd,
        output,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(command);
      setCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Terminal</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-[#d4d4d4] hover:bg-[#2d2d2d]"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="p-3 space-y-2 font-mono text-sm">
            {history.length === 0 && (
              <div className="text-[#858585]">
                Welcome to the terminal. Type 'help' for available commands.
              </div>
            )}
            {history.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#4ec9b0]">$</span>
                  <span className="text-[#d4d4d4]">{item.command}</span>
                </div>
                {item.output && (
                  <div className="pl-4 text-[#cccccc] whitespace-pre-wrap">
                    {item.output}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t border-[#3c3c3c] px-3 py-2">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-[#4ec9b0]">$</span>
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[#d4d4d4] placeholder:text-[#858585] h-7 px-0"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
