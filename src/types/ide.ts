export type FileType = 'file' | 'folder';

export interface FileNode {
  id: string;
  name: string;
  type: FileType;
  path: string;
  content?: string;
  children?: FileNode[];
  parentId?: string;
}

export interface OpenFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

export type FileOperation = 'cut' | 'copy' | null;

export interface ClipboardItem {
  node: FileNode;
  operation: FileOperation;
}
