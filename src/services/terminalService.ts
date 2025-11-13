export interface GitRepository {
  branch: string;
  commits: GitCommit[];
  staged: Set<string>;
  modified: Set<string>;
  untracked: Set<string>;
  initialized: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

export type TerminalEventType = 'git-add' | 'git-rm' | 'git-init' | 'file-touch';

export interface TerminalEventListener {
  (event: TerminalEventType, data: any): void;
}

class TerminalService {
  private currentDir: string = '~/project';
  private repos: Map<string, GitRepository> = new Map();
  private fileSystem: Map<string, string> = new Map();
  private listeners: TerminalEventListener[] = [];

  constructor() {
    this.initializeFileSystem();
    console.log('%c[Terminal Service] Initialized', 'color: #0dbc79; font-weight: bold');
    console.log('%cGit commands available: init, status, add, commit, log, branch, clone', 'color: #11a8cd');
  }

  subscribe(listener: TerminalEventListener) {
    this.listeners.push(listener);
    console.log('[Terminal Service] Listener subscribed');
  }

  unsubscribe(listener: TerminalEventListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
    console.log('[Terminal Service] Listener unsubscribed');
  }

  private notifyListeners(event: TerminalEventType, data: any) {
    console.log(`[Terminal Service] Event: ${event}`, data);
    this.listeners.forEach(listener => listener(event, data));
  }

  private initializeFileSystem() {
    this.fileSystem.set('~/project/README.md', '# Project\nWelcome to your project!');
  }

  private getRepo(path: string = this.currentDir): GitRepository | null {
    return this.repos.get(path) || null;
  }

  private ensureRepo(path: string = this.currentDir): GitRepository {
    if (!this.repos.has(path)) {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git');
    }
    return this.repos.get(path)!;
  }

  private generateHash(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private getCurrentFiles(): string[] {
    const prefix = this.currentDir + '/';
    return Array.from(this.fileSystem.keys())
      .filter(path => path.startsWith(prefix))
      .map(path => path.replace(prefix, ''));
  }

  async executeCommand(command: string): Promise<string> {
    const trimmed = command.trim();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];

    console.log(`[Terminal] Executing: ${command}`);

    try {
      if (cmd === 'git') {
        return await this.handleGitCommand(parts.slice(1));
      } else if (cmd === 'ls') {
        return this.handleLs();
      } else if (cmd === 'pwd') {
        return this.currentDir;
      } else if (cmd === 'cd') {
        return this.handleCd(parts[1]);
      } else if (cmd === 'mkdir') {
        return this.handleMkdir(parts[1]);
      } else if (cmd === 'touch') {
        return this.handleTouch(parts[1]);
      } else if (cmd === 'cat') {
        return this.handleCat(parts[1]);
      } else if (cmd === 'echo') {
        return parts.slice(1).join(' ');
      } else if (cmd === 'clear') {
        return '\x1b[2J\x1b[H';
      } else if (cmd === 'help') {
        return this.getHelp();
      } else if (trimmed === '') {
        return '';
      } else {
        return `bash: ${cmd}: command not found`;
      }
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  private async handleGitCommand(args: string[]): Promise<string> {
    if (args.length === 0) {
      return this.getGitHelp();
    }

    const subcommand = args[0];

    switch (subcommand) {
      case 'init':
        return this.gitInit();
      case 'status':
        return this.gitStatus();
      case 'add':
        return this.gitAdd(args.slice(1));
      case 'commit':
        return this.gitCommit(args.slice(1));
      case 'log':
        return this.gitLog(args.slice(1));
      case 'branch':
        return this.gitBranch(args.slice(1));
      case 'clone':
        return this.gitClone(args.slice(1));
      default:
        return `git: '${subcommand}' is not a git command. See 'git --help'.`;
    }
  }

  private gitInit(): string {
    if (this.repos.has(this.currentDir)) {
      return `Reinitialized existing Git repository in ${this.currentDir}/.git/`;
    }

    this.repos.set(this.currentDir, {
      branch: 'main',
      commits: [],
      staged: new Set(),
      modified: new Set(),
      untracked: new Set(this.getCurrentFiles()),
      initialized: true,
    });

    console.log(`[Git] Initialized repository at ${this.currentDir}`);
    this.notifyListeners('git-init', { path: this.currentDir });
    return `Initialized empty Git repository in ${this.currentDir}/.git/`;
  }

  private gitStatus(): string {
    const repo = this.ensureRepo();
    const lines: string[] = [];

    lines.push(`On branch ${repo.branch}`);

    if (repo.commits.length === 0) {
      lines.push('\nNo commits yet\n');
    } else {
      lines.push('');
    }

    if (repo.staged.size > 0) {
      lines.push('Changes to be committed:');
      lines.push('  (use "git restore --staged <file>..." to unstage)\n');
      repo.staged.forEach(file => {
        lines.push(`\t\x1b[32mnew file:   ${file}\x1b[0m`);
      });
      lines.push('');
    }

    if (repo.modified.size > 0) {
      lines.push('Changes not staged for commit:');
      lines.push('  (use "git add <file>..." to update what will be committed)\n');
      repo.modified.forEach(file => {
        lines.push(`\t\x1b[31mmodified:   ${file}\x1b[0m`);
      });
      lines.push('');
    }

    if (repo.untracked.size > 0) {
      lines.push('Untracked files:');
      lines.push('  (use "git add <file>..." to include in what will be committed)\n');
      repo.untracked.forEach(file => {
        lines.push(`\t\x1b[31m${file}\x1b[0m`);
      });
      lines.push('');
    }

    if (repo.staged.size === 0 && repo.modified.size === 0 && repo.untracked.size === 0) {
      lines.push('nothing to commit, working tree clean');
    }

    return lines.join('\n');
  }

  private gitAdd(args: string[]): string {
    const repo = this.ensureRepo();

    if (args.length === 0) {
      return 'Nothing specified, nothing added.';
    }

    const files = args[0] === '.' ? Array.from(repo.untracked) : args;

    files.forEach(file => {
      if (repo.untracked.has(file)) {
        repo.untracked.delete(file);
        repo.staged.add(file);
      } else if (repo.modified.has(file)) {
        repo.modified.delete(file);
        repo.staged.add(file);
      }
    });

    console.log(`[Git] Staged files:`, files);
    files.forEach(file => this.notifyListeners('git-add', { file }));
    return '';
  }

  private gitCommit(args: string[]): string {
    const repo = this.ensureRepo();

    if (repo.staged.size === 0) {
      return 'nothing to commit, working tree clean';
    }

    let message = '';
    const messageIndex = args.indexOf('-m');
    if (messageIndex !== -1 && args[messageIndex + 1]) {
      message = args.slice(messageIndex + 1).join(' ').replace(/^["']|["']$/g, '');
    }

    if (!message) {
      return 'Aborting commit due to empty commit message.';
    }

    const commit: GitCommit = {
      hash: this.generateHash(),
      message,
      author: 'User <user@example.com>',
      date: new Date(),
      files: Array.from(repo.staged),
    };

    repo.commits.push(commit);
    repo.staged.clear();

    console.log(`[Git] Created commit:`, commit);

    return `[${repo.branch} ${commit.hash}] ${message}\n ${commit.files.length} file${commit.files.length !== 1 ? 's' : ''} changed`;
  }

  private gitLog(args: string[]): string {
    const repo = this.ensureRepo();

    if (repo.commits.length === 0) {
      return 'fatal: your current branch \'main\' does not have any commits yet';
    }

    const oneline = args.includes('--oneline');
    const lines: string[] = [];

    repo.commits.slice().reverse().forEach((commit, index) => {
      if (oneline) {
        lines.push(`\x1b[33m${commit.hash}\x1b[0m ${commit.message}`);
      } else {
        lines.push(`\x1b[33mcommit ${commit.hash}\x1b[0m`);
        lines.push(`Author: ${commit.author}`);
        lines.push(`Date:   ${commit.date.toDateString()}`);
        lines.push('');
        lines.push(`    ${commit.message}`);
        if (index < repo.commits.length - 1) {
          lines.push('');
        }
      }
    });

    return lines.join('\n');
  }

  private gitBranch(args: string[]): string {
    const repo = this.ensureRepo();

    if (args.length === 0) {
      return `* \x1b[32m${repo.branch}\x1b[0m`;
    }

    return 'Branch operations not yet fully implemented';
  }

  private gitClone(args: string[]): string {
    if (args.length === 0) {
      return 'fatal: You must specify a repository to clone.';
    }

    const url = args[0];
    const repoName = url.split('/').pop()?.replace('.git', '') || 'repository';

    console.log(`[Git] Cloning ${url}...`);

    return `Cloning into '${repoName}'...\nNote: This is a simulated clone. Real Git clone would require backend support.`;
  }

  private handleLs(): string {
    const files = this.getCurrentFiles();
    return files.length > 0 ? files.join('\n') : '';
  }

  private handleCd(path?: string): string {
    if (!path || path === '~') {
      this.currentDir = '~/project';
    } else if (path === '..') {
      const parts = this.currentDir.split('/');
      parts.pop();
      this.currentDir = parts.join('/') || '~';
    } else {
      this.currentDir = path.startsWith('/') ? path : `${this.currentDir}/${path}`;
    }
    return '';
  }

  private handleMkdir(dirname?: string): string {
    if (!dirname) {
      return 'mkdir: missing operand';
    }
    console.log(`[Terminal] Created directory: ${dirname}`);
    return '';
  }

  private handleTouch(filename?: string): string {
    if (!filename) {
      return 'touch: missing file operand';
    }
    const fullPath = `${this.currentDir}/${filename}`;
    this.fileSystem.set(fullPath, '');

    const repo = this.getRepo();
    if (repo) {
      repo.untracked.add(filename);
    }

    console.log(`[Terminal] Created file: ${filename}`);
    this.notifyListeners('file-touch', { file: filename });
    return '';
  }

  private handleCat(filename?: string): string {
    if (!filename) {
      return 'cat: missing file operand';
    }
    const fullPath = `${this.currentDir}/${filename}`;
    const content = this.fileSystem.get(fullPath);
    if (content === undefined) {
      return `cat: ${filename}: No such file or directory`;
    }
    return content;
  }

  private getHelp(): string {
    return `Available commands:
  Git commands:
    git init          - Initialize a new git repository
    git status        - Show the working tree status
    git add <file>    - Add file contents to the index
    git add .         - Add all files to the index
    git commit -m     - Record changes to the repository
    git log           - Show commit logs
    git log --oneline - Show commit logs in one line
    git branch        - List branches
    git clone <url>   - Clone a repository

  File commands:
    ls                - List directory contents
    pwd               - Print working directory
    cd <dir>          - Change directory
    mkdir <dir>       - Make directory
    touch <file>      - Create empty file
    cat <file>        - Display file contents
    echo <text>       - Display text
    clear             - Clear the terminal
    help              - Show this help message`;
  }

  private getGitHelp(): string {
    return `usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]
           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]
           [-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]
           [--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]
           <command> [<args>]

Available commands:
   init       Create an empty Git repository
   clone      Clone a repository into a new directory
   add        Add file contents to the index
   status     Show the working tree status
   commit     Record changes to the repository
   log        Show commit logs
   branch     List, create, or delete branches`;
  }

  getCurrentDirectory(): string {
    return this.currentDir;
  }

  getRepository(): GitRepository | null {
    return this.getRepo();
  }

  hasGitRepo(): boolean {
    return this.repos.has(this.currentDir);
  }
}

export const terminalService = new TerminalService();
