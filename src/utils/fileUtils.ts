import { FileNode } from '@/types/ide';

export function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    sql: 'sql',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'shell',
  };

  return languageMap[ext || ''] || 'plaintext';
}

export function searchInFiles(files: FileNode[], query: string): FileNode[] {
  const results: FileNode[] = [];

  function search(node: FileNode) {
    if (node.type === 'file') {
      const contentMatch = node.content?.toLowerCase().includes(query.toLowerCase());
      const nameMatch = node.name.toLowerCase().includes(query.toLowerCase());

      if (contentMatch || nameMatch) {
        results.push(node);
      }
    }

    if (node.children) {
      node.children.forEach(search);
    }
  }

  files.forEach(search);
  return results;
}

export function findNodeById(files: FileNode[], id: string): FileNode | null {
  for (const file of files) {
    if (file.id === id) return file;
    if (file.children) {
      const found = findNodeById(file.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findNodeByPath(files: FileNode[], path: string): FileNode | null {
  for (const file of files) {
    if (file.path === path) return file;
    if (file.children) {
      const found = findNodeByPath(file.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function removeNodeById(files: FileNode[], id: string): FileNode[] {
  return files
    .filter(file => file.id !== id)
    .map(file => ({
      ...file,
      children: file.children ? removeNodeById(file.children, id) : undefined,
    }));
}

export function updateNodeById(
  files: FileNode[],
  id: string,
  updates: Partial<FileNode>
): FileNode[] {
  return files.map(file => {
    if (file.id === id) {
      return { ...file, ...updates };
    }
    if (file.children) {
      return {
        ...file,
        children: updateNodeById(file.children, id, updates),
      };
    }
    return file;
  });
}

export function addNodeToParent(
  files: FileNode[],
  parentId: string | null,
  newNode: FileNode
): FileNode[] {
  if (parentId === null) {
    return [...files, newNode];
  }

  return files.map(file => {
    if (file.id === parentId) {
      return {
        ...file,
        children: [...(file.children || []), newNode],
      };
    }
    if (file.children) {
      return {
        ...file,
        children: addNodeToParent(file.children, parentId, newNode),
      };
    }
    return file;
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getPathBreadcrumbs(path: string): string[] {
  return path.split(' > ');
}
