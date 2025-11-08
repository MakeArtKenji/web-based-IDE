import { useState } from 'react';
import { FileNode } from '@/types/ide';
import { Search, File } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { searchInFiles } from '@/utils/fileUtils';

interface SearchPanelProps {
  files: FileNode[];
  onFileClick: (file: FileNode) => void;
}

export function SearchPanel({ files, onFileClick }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FileNode[]>([]);

  const handleSearch = () => {
    if (query.trim()) {
      const searchResults = searchInFiles(files, query);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  };

  return (
    <div className="h-full flex flex-col border-r bg-background">
      <div className="p-3 border-b space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search in files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleSearch} className="h-8">
            Search
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {results.length === 0 && query && (
            <p className="text-sm text-muted-foreground p-2">No results found</p>
          )}
          {results.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded transition-colors"
              onClick={() => onFileClick(file)}
            >
              <File className="h-4 w-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {file.path}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
