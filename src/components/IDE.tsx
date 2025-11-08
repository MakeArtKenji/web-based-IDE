import { useState, useEffect } from 'react';
import { FileNode, OpenFile, ClipboardItem } from '@/types/ide';
import { FileExplorer } from './FileExplorer';
import { CodeEditor } from './CodeEditor';
import { SearchPanel } from './SearchPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Code2,
  Play,
  Search,
  FolderTree,
  X,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import {
  generateId,
  getLanguageFromExtension,
  findNodeById,
  removeNodeById,
  updateNodeById,
  addNodeToParent,
  getPathBreadcrumbs,
} from '@/utils/fileUtils';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
          content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Hello World</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>',
        },
        {
          id: generateId(),
          name: 'styles.css',
          type: 'file',
          path: 'project > styles.css',
          content: 'body {\n  margin: 0;\n  padding: 20px;\n  font-family: Arial, sans-serif;\n}',
        },
        {
          id: generateId(),
          name: 'app.ts',
          type: 'file',
          path: 'project > app.ts',
          content: 'console.log("Hello from TypeScript!");',
        },
      ],
    },
  ]);

  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const [sidebarView, setSidebarView] = useState<'explorer' | 'search'>('explorer');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const activeFile = openFiles.find((f) => f.id === activeFileId) || null;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

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

  const handleContentChange = (content: string) => {
    if (activeFileId) {
      setOpenFiles(
        openFiles.map((f) => (f.id === activeFileId ? { ...f, content } : f))
      );
      setFiles(
        updateNodeById(files, activeFileId, { content })
      );
    }
  };

  const handleAddFile = (parentId: string | null, isFolder: boolean) => {
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

  const handleDelete = (id: string) => {
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="h-12 border-b flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">Web IDE</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-12 border-r flex flex-col gap-2 py-2 bg-card">
          <Button
            variant={sidebarView === 'explorer' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setSidebarView('explorer')}
            className="mx-1"
          >
            <FolderTree className="h-5 w-5" />
          </Button>
          <Button
            variant={sidebarView === 'search' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setSidebarView('search')}
            className="mx-1"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        <div className="w-64 flex-shrink-0">
          {sidebarView === 'explorer' ? (
            <FileExplorer
              files={files}
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
          ) : (
            <SearchPanel files={files} onFileClick={handleFileClick} />
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value="code" className="h-full flex flex-col">
            <div className="border-b bg-card">
              <TabsList className="h-10 bg-transparent rounded-none border-b-0 w-full justify-start px-2">
                <TabsTrigger value="code" className="gap-2">
                  <Code2 className="h-4 w-4" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="output" className="gap-2">
                  <Play className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="code" className="flex-1 flex flex-col m-0 overflow-hidden">
              {openFiles.length > 0 && (
                <div className="border-b bg-card">
                  <ScrollArea className="w-full">
                    <div className="flex items-center h-10">
                      {openFiles.map((file) => (
                        <div
                          key={file.id}
                          className={cn(
                            'flex items-center gap-2 px-3 h-full border-r cursor-pointer hover:bg-accent transition-colors group',
                            activeFileId === file.id && 'bg-background'
                          )}
                          onClick={() => setActiveFileId(file.id)}
                        >
                          <span className="text-sm">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
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
                <div className="px-3 py-2 border-b bg-muted/30 text-xs text-muted-foreground flex items-center gap-1">
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
                  theme={theme}
                />
              </div>
            </TabsContent>

            <TabsContent value="output" className="flex-1 m-0 overflow-hidden">
              <div className="h-full flex items-center justify-center bg-muted/20 p-8">
                <div className="text-center space-y-2">
                  <Play className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Preview functionality coming soon
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This panel will display output and previews
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
