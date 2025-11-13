import { terminalService } from './terminalService';

export type GitOperation = 'add' | 'rm' | 'modify';

interface GitEventListener {
  (filePath: string, operation: GitOperation): void;
}

class GitService {
  private listeners: GitEventListener[] = [];
  private isGitInitialized: boolean = false;

  constructor() {
    console.log('%c[Git Service] Initialized', 'color: #f5f543; font-weight: bold');
  }

  subscribe(listener: GitEventListener) {
    this.listeners.push(listener);
    console.log('[Git Service] Listener subscribed');
  }

  unsubscribe(listener: GitEventListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
    console.log('[Git Service] Listener unsubscribed');
  }

  private notifyListeners(filePath: string, operation: GitOperation) {
    console.log(`[Git Service] Notifying listeners: ${operation} ${filePath}`);
    this.listeners.forEach(listener => listener(filePath, operation));
  }

  async initGit(): Promise<void> {
    if (this.isGitInitialized) {
      console.log('[Git Service] Git already initialized');
      return;
    }

    const result = await terminalService.executeCommand('git init');
    this.isGitInitialized = true;
    console.log('[Git Service] Git initialized:', result);
  }

  async ensureGitInit(): Promise<void> {
    if (!this.isGitInitialized) {
      await this.initGit();
    }
  }

  async addFile(filePath: string): Promise<void> {
    await this.ensureGitInit();

    console.log(`%c[Git Service] Adding file to Git: ${filePath}`, 'color: #0dbc79; font-weight: bold');

    terminalService.addFileFromUI(filePath);

    this.notifyListeners(filePath, 'add');
  }

  async removeFile(filePath: string): Promise<void> {
    await this.ensureGitInit();

    console.log(`%c[Git Service] Removing file from Git: ${filePath}`, 'color: #cd3131; font-weight: bold');

    terminalService.removeFileFromUI(filePath);

    this.notifyListeners(filePath, 'rm');
  }

  async modifyFile(filePath: string): Promise<void> {
    await this.ensureGitInit();

    console.log(`%c[Git Service] File modified (tracked): ${filePath}`, 'color: #e5e510; font-weight: bold');

    terminalService.modifyFileFromUI(filePath);

    this.notifyListeners(filePath, 'modify');
  }

  async getStatus(): Promise<string> {
    await this.ensureGitInit();
    return await terminalService.executeCommand('git status');
  }

  setInitialized(initialized: boolean) {
    this.isGitInitialized = initialized;
  }

  isInitialized(): boolean {
    return this.isGitInitialized;
  }
}

export const gitService = new GitService();
