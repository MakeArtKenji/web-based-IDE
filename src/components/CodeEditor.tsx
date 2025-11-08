import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { OpenFile } from '@/types/ide';
import { Loader2 } from 'lucide-react';

interface CodeEditorProps {
  file: OpenFile | null;
  onContentChange: (content: string) => void;
  theme?: 'light' | 'dark';
}

export function CodeEditor({ file, onContentChange, theme = 'light' }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (editorRef.current && file) {
      editorRef.current.setValue(file.content);
    }
  }, [file?.id]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a file to edit</p>
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={file.language}
      value={file.content}
      onChange={(value) => onContentChange(value || '')}
      onMount={(editor) => {
        editorRef.current = editor;
      }}
      theme={theme === 'dark' ? 'vs-dark' : 'light'}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
      }}
      loading={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    />
  );
}
