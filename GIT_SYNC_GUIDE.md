# Git-Aware IDE - Two-Way Synchronization Guide

## Overview

This IDE features complete two-way synchronization between the file explorer UI and the integrated Git terminal. All file operations are automatically tracked in Git, and terminal commands immediately reflect in the UI.

---

## Features

### 1. UI → Terminal/Git Sync

When you perform operations in the file explorer:

- **Create File**: Automatically runs `git add <file>` and stages the file
- **Delete File**: Automatically removes from Git tracking
- **Edit File**: Marks the file as modified in Git status
- **Create Folder**: Logs the operation (folders tracked when containing files)

### 2. Terminal → UI Sync

When you run terminal commands:

- **`touch <file>`**: File appears immediately in the file explorer
- **`mkdir <folder>`**: Folder appears immediately in the file explorer
- **`git add <file>`**: Updates Git staging state
- **`git init`**: Initializes Git repository
- **`cd <path>`**: Updates the terminal prompt with new path

### 3. Enhanced Terminal Prompt

The terminal displays a Git-style prompt similar to:

```
user@IDE MINGW64 /project (main)
$
```

Features:
- Shows current username and hostname
- Displays current working directory path
- Shows Git branch name when in a repository
- Updates automatically when changing directories

---

## Console Debugging

All operations are logged to the browser console with color-coded categories:

### UI → Git Operations (Blue)
```
[UI → Git] File created in UI: index.ts
[UI → Git] File deleted in UI: old-file.js
[UI → Git] File content changed: app.tsx
```

### Terminal → UI Operations (Cyan)
```
[IDE → UI] File created from terminal: config.json
[IDE → UI] Folder created from terminal: components
[IDE → UI] Git initialized from terminal
```

### Git Service Operations (Green/Yellow/Red)
```
[Git Service] Adding file to Git: index.ts
[Git Service] File modified (tracked): app.tsx
[Git Service] Removing file from Git: old-file.js
```

### Terminal Service Operations (Green)
```
[Terminal] Created file: test.js
[Terminal] Created directory: src
```

---

## How It Works

### Architecture

1. **Git Service** (`src/services/gitService.ts`)
   - Manages Git operations from UI
   - Coordinates with Terminal Service
   - Notifies listeners of Git changes

2. **Terminal Service** (`src/services/terminalService.ts`)
   - Executes terminal commands
   - Maintains Git repository state
   - Broadcasts events to UI
   - Formats enhanced terminal prompt

3. **IDE Component** (`src/components/IDE.tsx`)
   - Subscribes to terminal events
   - Updates UI when terminal changes occur
   - Triggers Git operations on UI actions

### Event Flow

#### UI → Git Flow:
1. User creates file in file explorer
2. IDE component calls `gitService.addFile()`
3. Git service calls `terminalService.addFileFromUI()`
4. Terminal service updates internal Git state
5. Console logs the operation

#### Terminal → UI Flow:
1. User runs `touch newfile.js` in terminal
2. Terminal service processes command
3. Terminal service broadcasts `file-touch` event
4. IDE component receives event
5. IDE component creates new FileNode
6. File explorer updates automatically
7. Console logs the operation

---

## Usage Examples

### Example 1: Creating a File in UI

**Action**: Right-click in file explorer → New File → name it "index.ts"

**What Happens**:
```
Console Output:
  [UI → Git] File created in UI: index.ts
  [Git Service] Adding file to Git: index.ts
  [Terminal] UI file added to Git: index.ts
```

**Result**: File appears in explorer AND is staged in Git

---

### Example 2: Creating a File in Terminal

**Action**: Type `touch app.tsx` in terminal

**What Happens**:
```
Console Output:
  [Terminal] Created file: app.tsx
  [Terminal Service] Event: file-touch
  [IDE → UI] File created from terminal: app.tsx
```

**Result**: File appears in file explorer immediately

---

### Example 3: Editing a File

**Action**: Edit content in code editor

**What Happens**:
```
Console Output:
  [UI → Git] File content changed: app.tsx
  [Git Service] File modified (tracked): app.tsx
  [Terminal] UI file modified: app.tsx
```

**Result**: File marked as modified in Git status

---

### Example 4: Git Commands in Terminal

**Action**: Run `git init` then `git status`

**What Happens**:
```
Console Output:
  [Git] Initialized repository at ~/project
  [Terminal Service] Event: git-init
  [IDE → UI] Git initialized from terminal

Terminal Output:
  Initialized empty Git repository in ~/project/.git/

  On branch main
  Changes to be committed:
    new file:   index.ts
    new file:   app.tsx
```

**Result**: Git repo initialized, all existing files shown in status

---

## Verification Checklist

Use this checklist to verify two-way sync is working:

### UI → Terminal Tests:
- [ ] Create file in UI → Check `git status` shows staged file
- [ ] Delete file in UI → Check `git status` no longer shows file
- [ ] Edit file in UI → Check `git status` shows modified
- [ ] All operations logged to console with colors

### Terminal → UI Tests:
- [ ] Run `touch test.js` → File appears in explorer
- [ ] Run `mkdir src` → Folder appears in explorer
- [ ] Run `git add test.js` → Check console for event
- [ ] Run `cd src` → Prompt updates with new path
- [ ] All operations logged to console with colors

### Prompt Tests:
- [ ] Terminal shows `user@IDE MINGW64 /project`
- [ ] After `git init`, shows branch: `(main)`
- [ ] After `cd src`, shows `/project/src`

---

## Troubleshooting

### File created in terminal doesn't appear in UI
- Check console for `[IDE → UI] File created from terminal` message
- Verify terminal service event listener is subscribed
- Check that the file name doesn't contain special characters

### Git status not updating after UI operations
- Check console for `[UI → Git]` messages
- Verify Git is initialized with `git init`
- Check git service is properly calling terminal service methods

### Terminal prompt not showing correctly
- Verify `terminalService.formatPrompt()` is being called
- Check that Git repository is initialized
- Look for ANSI color codes in terminal output

---

## Technical Details

### Git State Management

The terminal service maintains a `GitRepository` object:

```typescript
interface GitRepository {
  branch: string;           // Current branch name
  commits: GitCommit[];     // Commit history
  staged: Set<string>;      // Files staged for commit
  modified: Set<string>;    // Modified tracked files
  untracked: Set<string>;   // New untracked files
  initialized: boolean;     // Whether git init has run
}
```

### Event System

Events are broadcast using a publish-subscribe pattern:

```typescript
type TerminalEventType =
  | 'git-add'      // File staged
  | 'git-rm'       // File removed
  | 'git-init'     // Git initialized
  | 'file-touch'   // File created via touch
  | 'file-mkdir'   // Folder created via mkdir
  | 'file-rm'      // File removed via rm
  | 'file-modify'  // File content changed
  | 'path-change'; // Directory changed
```

---

## Future Enhancements

Potential improvements:
- Real file system integration
- Git branch switching in UI
- Visual Git status indicators in file explorer
- Commit history viewer
- Diff viewer for modified files
- Merge conflict resolution UI

---

## Console Log Color Reference

| Category | Color | Example |
|----------|-------|---------|
| UI → Git | Blue (`#3b8eea`) | File operations from UI |
| Terminal → UI | Cyan (`#11a8cd`) | Events from terminal to UI |
| Git Service | Yellow (`#f5f543`) | Git service initialization |
| Success | Green (`#0dbc79`) | File created, Git add |
| Modification | Yellow (`#f5f543`) | File modified |
| Deletion | Red (`#f14c4c`) | File deleted, Git rm |
| Event | Purple (`#bc3fbc`) | Terminal events |

---

## Summary

This IDE provides seamless integration between the visual file explorer and the Git terminal. Every action is synchronized, logged, and immediately reflected in both interfaces, creating a cohesive development environment that never gets out of sync.
