import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

type StoreData = Record<string, unknown>;

const WRITE_DEBOUNCE_MS = 200;

class JsonStore {
  private file: string;
  private data: StoreData = {};
  private writeTimer: NodeJS.Timeout | null = null;

  constructor(fileName = 'lingodesk-store.json') {
    this.file = path.join(app.getPath('userData'), fileName);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          this.data = parsed as StoreData;
        }
      }
    } catch (err) {
      console.error('[store] failed to load, starting fresh:', err);
      this.data = {};
    }
  }

  get<T>(key: string, fallback: T): T {
    const value = this.data[key];
    if (value === undefined || value === null) return fallback;
    return value as T;
  }

  set(key: string, value: unknown): void {
    this.data[key] = value;
    this.scheduleWrite();
  }

  delete(key: string): void {
    delete this.data[key];
    this.scheduleWrite();
  }

  flush(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    this.writeNow();
  }

  private scheduleWrite(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.writeNow();
    }, WRITE_DEBOUNCE_MS);
  }

  private writeNow(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[store] failed to write:', err);
    }
  }
}

export const store = new JsonStore();
