import { useState, useEffect } from 'react';
import { FileNode, OpenFile, ClipboardItem } from '@/types/ide';
import { FileExplorer } from './FileExplorer';
import { CodeEditor } from './CodeEditor';
import { Terminal } from './Terminal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Code2,
  Play,
  X,
  ChevronRight,
  Search,
  Terminal as TerminalIcon,
} from 'lucide-react';
import {
  generateId,
  getLanguageFromExtension,
  findNodeById,
  removeNodeById,
  updateNodeById,
  addNodeToParent,
  getPathBreadcrumbs,
  searchInFiles,
} from '@/utils/fileUtils';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { gitService } from '@/services/gitService';
import { terminalService } from '@/services/terminalService';

export function IDE() {
  const [files, setFiles] = useState<FileNode[]>([
    {
      id: 'root',
      name: 'project',
      type: 'folder',
      path: 'project',
      children: [
        {
          id: generateId(),
          name: 'index.html',
          type: 'file',
          path: 'project > index.html',
          content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Hello World</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>',
        },
        {
          id: generateId(),
          name: 'styles.css',
          type: 'file',
          path: 'project > styles.css',
          content: 'body {\n  margin: 0;\n  padding: 20px;\n  font-family: Arial, sans-serif;\n  background: #1e1e1e;\n  color: #d4d4d4;\n}',
        },
        {
          id: generateId(),
          name: 'script.js',
          type: 'file',
          path: 'project > script.js',
          content: 'console.log("Hello from JavaScript!");\n\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("World"));',
        },
        {
          id: generateId(),
          name: 'app.py',
          type: 'file',
          path: 'project > app.py',
          content: 'def greet(name):\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))\n    print("Python script executed!")',
        },
      ],
    },
  ]);

  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [output, setOutput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

  const activeFile = openFiles.find((f) => f.id === activeFileId) || null;

  useEffect(() => {
    document.documentElement.classList.add('dark');

    const handleTerminalEvent = (event: any, data: any) => {
      console.log(`%c[IDE] Terminal event received: ${event}`, 'color: #bc3fbc; font-weight: bold', data);

      if (event === 'git-init') {
        gitService.setInitialized(true);
        console.log('%c[IDE → UI] Git initialized from terminal', 'color: #11a8cd; font-weight: bold');
      } else if (event === 'git-add') {
        console.log(`%c[IDE → UI] File staged from terminal: ${data.file}`, 'color: #11a8cd; font-weight: bold');
      } else if (event === 'file-touch') {
        console.log(`%c[IDE → UI] File created from terminal: ${data.file}`, 'color: #11a8cd; font-weight: bold');

        const parent = files[0];
        const parentPath = parent?.path || 'project';
        const newNode: FileNode = {
          id: generateId(),
          name: data.file,
          type: 'file',
          path: `${parentPath} > ${data.file}`,
          content: '',
          parentId: undefined,
        };
        setFiles(addNodeToParent(files, null, newNode));
      } else if (event === 'file-mkdir') {
        console.log(`%c[IDE → UI] Folder created from terminal: ${data.folder}`, 'color: #11a8cd; font-weight: bold');

        const parent = files[0];
        const parentPath = parent?.path || 'project';
        const newNode: FileNode = {
          id: generateId(),
          name: data.folder,
          type: 'folder',
          path: `${parentPath} > ${data.folder}`,
          children: [],
          parentId: undefined,
        };
        setFiles(addNodeToParent(files, null, newNode));
      }
    };

    terminalService.subscribe(handleTerminalEvent);

    return () => {
      terminalService.unsubscribe(handleTerminalEvent);
    };
  }, []);

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file') {
      const existingFile = openFiles.find((f) => f.id === node.id);
      if (existingFile) {
        setActiveFileId(node.id);
      } else {
        const newFile: OpenFile = {
          id: node.id,
          name: node.name,
          path: node.path,
          content: node.content || '',
          language: getLanguageFromExtension(node.name),
        };
        setOpenFiles([...openFiles, newFile]);
        setActiveFileId(node.id);
      }
    }
  };

  const handleCloseFile = (id: string) => {
    const newOpenFiles = openFiles.filter((f) => f.id !== id);
    setOpenFiles(newOpenFiles);
    if (activeFileId === id) {
      setActiveFileId(newOpenFiles.length > 0 ? newOpenFiles[0].id : null);
    }
  };

  const handleContentChange = async (content: string) => {
    if (activeFileId) {
      const activeFile = openFiles.find((f) => f.id === activeFileId);

      setOpenFiles(
        openFiles.map((f) => (f.id === activeFileId ? { ...f, content } : f))
      );
      setFiles(updateNodeById(files, activeFileId, { content }));

      if (activeFile) {
        console.log(`%c[UI → Git] File content changed: ${activeFile.name}`, 'color: #f5f543; font-weight: bold');
        await gitService.modifyFile(activeFile.name);
      }
    }
  };

  const handleAddFile = async (parentId: string | null, isFolder: boolean) => {
    const newName = isFolder ? 'new-folder' : 'new-file.txt';
    const parent = parentId ? findNodeById(files, parentId) : null;
    const parentPath = parent ? parent.path : files[0]?.path || 'project';

    const newNode: FileNode = {
      id: generateId(),
      name: newName,
      type: isFolder ? 'folder' : 'file',
      path: `${parentPath} > ${newName}`,
      content: isFolder ? undefined : '',
      children: isFolder ? [] : undefined,
      parentId: parentId || undefined,
    };

    setFiles(addNodeToParent(files, parentId, newNode));

    if (!isFolder) {
      console.log(`%c[UI → Git] File created in UI: ${newName}`, 'color: #3b8eea; font-weight: bold');
      await gitService.addFile(newName);
    } else {
      console.log(`%c[UI → Git] Folder created in UI: ${newName}`, 'color: #3b8eea; font-weight: bold');
    }
  };

  const handleRename = (id: string, newName: string) => {
    const node = findNodeById(files, id);
    if (!node) return;

    const pathParts = node.path.split(' > ');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join(' > ');

    setFiles(updateNodeById(files, id, { name: newName, path: newPath }));

    const openFile = openFiles.find((f) => f.id === id);
    if (openFile) {
      setOpenFiles(
        openFiles.map((f) =>
          f.id === id
            ? {
                ...f,
                name: newName,
                path: newPath,
                language: getLanguageFromExtension(newName),
              }
            : f
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    const node = findNodeById(files, id);
    if (node) {
      if (node.type === 'file') {
        console.log(`%c[UI → Git] File deleted in UI: ${node.name}`, 'color: #f14c4c; font-weight: bold');
        await gitService.removeFile(node.name);
      } else {
        console.log(`%c[UI → Git] Folder deleted in UI: ${node.name}`, 'color: #f14c4c; font-weight: bold');
      }
    }

    setFiles(removeNodeById(files, id));
    setOpenFiles(openFiles.filter((f) => f.id !== id));
    if (activeFileId === id) {
      setActiveFileId(openFiles.length > 1 ? openFiles[0].id : null);
    }
  };

  const handleCut = (node: FileNode) => {
    setClipboard({ node, operation: 'cut' });
  };

  const handleCopy = (node: FileNode) => {
    setClipboard({ node, operation: 'copy' });
  };

  const handlePaste = (parentId: string | null) => {
    if (!clipboard) return;

    const { node, operation } = clipboard;
    const parent = parentId ? findNodeById(files, parentId) : null;
    const parentPath = parent ? parent.path : files[0]?.path || 'project';

    const cloneNode = (original: FileNode, newParentPath: string): FileNode => {
      const newPath = `${newParentPath} > ${original.name}`;
      return {
        ...original,
        id: generateId(),
        path: newPath,
        parentId: parentId || undefined,
        children: original.children?.map((child) => cloneNode(child, newPath)),
      };
    };

    const newNode = cloneNode(node, parentPath);

    if (operation === 'cut') {
      setFiles(removeNodeById(files, node.id));
      setFiles((prev) => addNodeToParent(prev, parentId, newNode));
      setClipboard(null);
    } else if (operation === 'copy') {
      setFiles(addNodeToParent(files, parentId, newNode));
    }
  };

  const handleRunCode = () => {
    if (!activeFile) return;

    setActiveTab('preview');
    let result = '';

    const ext = activeFile.name.split('.').pop()?.toLowerCase();

    if (ext === 'html') {
      result = activeFile.content;
    } else if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') {
      try {
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: any[]) => {
          logs.push(args.map((arg) => String(arg)).join(' '));
          originalLog(...args);
        };

        eval(activeFile.content);

        console.log = originalLog;
        result = logs.length > 0 ? logs.join('\n') : 'Code executed successfully (no output)';
      } catch (error) {
        result = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else if (ext === 'py') {
      result = `Python execution requires a backend server.\n\nCode to execute:\n${activeFile.content}\n\nExpected output: Hello, World!\nPython script executed!`;
    } else if (ext === 'css') {
      result = `CSS Preview:\n\n${activeFile.content}`;
    } else {
      result = `File type .${ext} cannot be executed directly.\nContent:\n\n${activeFile.content}`;
    }

    setOutput(result);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    const results = searchInFiles(files, searchQuery);
    if (results.length > 0) {
      handleFileClick(results[0]);
    }
  };

  const filteredFiles = searchQuery.trim()
    ? files.map((root) => ({
        ...root,
        children: root.children?.filter((child) =>
          child.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
    : files;

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="h-14 border-b flex items-center justify-between px-4 bg-[#1e1e1e] border-[#3c3c3c]">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">WEB IDE</h1>
          </div>

          <div className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Search files..."
                className="pl-9 h-9 bg-[#3c3c3c] border-[#3c3c3c] focus-visible:ring-1 focus-visible:ring-[#007acc]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTerminal(!showTerminal)}
            className={cn(
              'h-9 w-9',
              showTerminal && 'bg-accent'
            )}
          >
            <TerminalIcon className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleRunCode}
            disabled={!activeFile}
            className="gap-2 h-9 bg-[#0e639c] hover:bg-[#1177bb]"
          >
            <Play className="h-4 w-4" />
            Run
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={showTerminal ? 70 : 100} minSize={30}>
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                <FileExplorer
                  files={filteredFiles}
                  onFileClick={handleFileClick}
                  onAddFile={handleAddFile}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  clipboard={clipboard}
                  onCut={handleCut}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
                  selectedFileId={activeFileId}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={80}>
                <div className="h-full flex flex-col overflow-hidden">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code' | 'preview')} className="h-full flex flex-col">
                    <div className="border-b bg-[#1e1e1e] border-[#3c3c3c]">
                      <TabsList className="h-10 bg-transparent rounded-none border-b-0 w-full justify-start px-2">
                        <TabsTrigger value="code" className="gap-2 data-[state=active]:bg-[#1e1e1e] data-[state=active]:border-b-2 data-[state=active]:border-[#007acc]">
                          <Code2 className="h-4 w-4" />
                          Code
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="gap-2 data-[state=active]:bg-[#1e1e1e] data-[state=active]:border-b-2 data-[state=active]:border-[#007acc]">
                          <Play className="h-4 w-4" />
                          Preview
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="code" className="flex-1 flex flex-col m-0 overflow-hidden">
                      {openFiles.length > 0 && (
                        <div className="border-b bg-[#252526] border-[#3c3c3c]">
                          <ScrollArea className="w-full">
                            <div className="flex items-center h-10">
                              {openFiles.map((file) => (
                                <div
                                  key={file.id}
                                  className={cn(
                                    'flex items-center gap-2 px-3 h-full border-r border-[#3c3c3c] cursor-pointer hover:bg-[#2d2d2d] transition-colors group',
                                    activeFileId === file.id && 'bg-[#1e1e1e]'
                                  )}
                                  onClick={() => setActiveFileId(file.id)}
                                >
                                  <span className="text-sm">{file.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-[#3c3c3c]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCloseFile(file.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {activeFile && (
                        <div className="px-3 py-2 border-b bg-[#252526] border-[#3c3c3c] text-xs text-muted-foreground flex items-center gap-1">
                          {getPathBreadcrumbs(activeFile.path).map((part, idx, arr) => (
                            <span key={idx} className="flex items-center gap-1">
                              {part}
                              {idx < arr.length - 1 && <ChevronRight className="h-3 w-3" />}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex-1 overflow-hidden">
                        <CodeEditor
                          file={activeFile}
                          onContentChange={handleContentChange}
                          theme="dark"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
                      <div className="h-full bg-[#1e1e1e]">
                        {output && activeFile?.name.endsWith('.html') ? (
                          <iframe
                            srcDoc={output}
                            className="w-full h-full border-0 bg-white"
                            title="Preview"
                            sandbox="allow-scripts"
                          />
                        ) : (
                          <ScrollArea className="h-full">
                            <pre className="p-4 text-sm font-mono text-[#d4d4d4] whitespace-pre-wrap">
                              {output || 'Click "Run" to execute the current file'}
                            </pre>
                          </ScrollArea>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {showTerminal && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <Terminal onClose={() => setShowTerminal(false)} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
