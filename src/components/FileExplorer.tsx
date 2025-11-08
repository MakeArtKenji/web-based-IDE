import { useState } from 'react';
import { FileNode, ClipboardItem } from '@/types/ide';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FileExplorerProps {
  files: FileNode[];
  onFileClick: (file: FileNode) => void;
  onAddFile: (parentId: string | null, isFolder: boolean) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  clipboard: ClipboardItem | null;
  onCut: (node: FileNode) => void;
  onCopy: (node: FileNode) => void;
  onPaste: (parentId: string | null) => void;
  selectedFileId: string | null;
}

export function FileExplorer({
  files,
  onFileClick,
  onAddFile,
  onRename,
  onDelete,
  clipboard,
  onCut,
  onCopy,
  onPaste,
  selectedFileId,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['root'])
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const startRename = (node: FileNode) => {
    setEditingId(node.id);
    setEditingName(node.name);
  };

  const finishRename = () => {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isEditing = editingId === node.id;
    const isSelected = selectedFileId === node.id;

    return (
      <div key={node.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={cn(
                'flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent transition-colors',
                isSelected && 'bg-accent',
                isEditing && 'bg-accent'
              )}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => {
                if (node.type === 'file') {
                  onFileClick(node);
                } else {
                  toggleFolder(node.id);
                }
              }}
            >
              {node.type === 'folder' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(node.id);
                  }}
                  className="hover:bg-muted rounded p-0.5"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}

              {node.type === 'folder' ? (
                isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-500" />
                )
              ) : (
                <File className="h-4 w-4 text-gray-500" />
              )}

              {isEditing ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishRename();
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditingName('');
                    }
                  }}
                  className="h-6 text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm truncate">{node.name}</span>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onAddFile(node.type === 'folder' ? node.id : null, false)}>
              <File className="h-4 w-4 mr-2" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAddFile(node.type === 'folder' ? node.id : null, true)}>
              <Folder className="h-4 w-4 mr-2" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => startRename(node)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onCut(node)}>
              <Scissors className="h-4 w-4 mr-2" />
              Cut
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onCopy(node)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </ContextMenuItem>
            {clipboard && (
              <ContextMenuItem onClick={() => onPaste(node.type === 'folder' ? node.id : null)}>
                <Clipboard className="h-4 w-4 mr-2" />
                Paste
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onDelete(node.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {node.type === 'folder' &&
          isExpanded &&
          node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col border-r bg-background">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="text-sm font-semibold">Explorer</h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddFile(null, false)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {files.map((file) => renderNode(file))}
        </div>
      </ScrollArea>
    </div>
  );
}
