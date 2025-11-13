import { useRef, useEffect } from "react";
import { Terminal as TerminalIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { terminalService } from "@/services/terminalService";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  onClose: () => void;
}

export function Terminal({ onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef<string>("");
  const cursorPositionRef = useRef<number>(0);
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      },
      rows: 20,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

   const prompt = () => {
     const promptText = terminalService.formatPrompt(); // "kenno@Jable MINGW64 /project $ "
     term.write("\r"); // move to start of current line
     term.write(promptText); // write prompt
     term.scrollToBottom();
   };




    term.writeln("\x1b[1;36mWeb-Based IDE Terminal\x1b[0m");
    term.writeln(
      'Type "help" for available commands, "git init" to start using Git.'
    );
    prompt();

    const executeCommand = async (command: string) => {
      const output = await terminalService.executeCommand(command);

      if (command.trim() === "clear") {
        term.clear();
      } else if (output) {
        term.writeln(output); // writeln ensures output goes below the prompt
      }
      
      if (command.trim() !== "") {
        commandHistoryRef.current.push(command);
        historyIndexRef.current = commandHistoryRef.current.length;
      }

      prompt();
      term.scrollToBottom(); // <-- always scroll after executing command
    };

    term.onData((data) => {
      const code = data.charCodeAt(0);

       if (code === 13) {
         // Enter
         const command = currentLineRef.current;
         currentLineRef.current = "";
         cursorPositionRef.current = 0;
         term.write("\r\n");
         executeCommand(command);
         executeCommand(command);
       } else if (code === 127) {
         if (cursorPositionRef.current > 0) {
           currentLineRef.current =
             currentLineRef.current.slice(0, cursorPositionRef.current - 1) +
             currentLineRef.current.slice(cursorPositionRef.current);
           cursorPositionRef.current--;
           term.write("\b \b");
         }
       } else if (code === 27) {
         if (data === "\x1b[A") {
           if (historyIndexRef.current > 0) {
             historyIndexRef.current--;
             const historyCommand =
               commandHistoryRef.current[historyIndexRef.current];
             term.write("\r\x1b[K" + historyCommand);
             currentLineRef.current = historyCommand;
             cursorPositionRef.current = historyCommand.length;
           }
         } else if (data === "\x1b[B") {
           if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
             historyIndexRef.current++;
             const historyCommand =
               commandHistoryRef.current[historyIndexRef.current];
             term.write("\r\x1b[K" + historyCommand);
             currentLineRef.current = historyCommand;
             cursorPositionRef.current = historyCommand.length;
           } else if (
             historyIndexRef.current ===
             commandHistoryRef.current.length - 1
           ) {
             historyIndexRef.current = commandHistoryRef.current.length;
             term.write("\r\x1b[K");
             currentLineRef.current = "";
             cursorPositionRef.current = 0;
           }
         }
       } else if (code >= 32 && code < 127) {
         currentLineRef.current =
           currentLineRef.current.slice(0, cursorPositionRef.current) +
           data +
           currentLineRef.current.slice(cursorPositionRef.current);
         cursorPositionRef.current++;
         term.write(data);
       }

      term.scrollToBottom(); // <-- scroll on every keystroke
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

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

      {/* Scrollable terminal container */}
      <div ref={terminalRef} className="flex-1 overflow-auto p-2" style={{ textAlign: 'left'}} />
    </div>
  );
}
