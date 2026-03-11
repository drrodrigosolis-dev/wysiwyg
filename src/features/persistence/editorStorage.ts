import Dexie, { type Table } from "dexie";

import { sampleDocument } from "../../content/sampleDocument";
import type { EditorDocument, RevisionSnapshot } from "../../lib/types";
import { SNAPSHOT_LIMIT, pruneSnapshots } from "../revisions/revisionPolicy";

const DOC_KEY = "velvet-ink/document/v2";
const SNAPSHOT_KEY = "velvet-ink/snapshots/v2";
const VALID_ACCENTS = new Set<EditorDocument["accent"]>(["ember", "tide", "moss", "rose", "gold", "slate"]);

export type WorkspaceStorage = {
  usingIndexedDb: boolean;
  loadDocument(): Promise<EditorDocument>;
  saveDocument(document: EditorDocument): Promise<void>;
  listSnapshots(): Promise<RevisionSnapshot[]>;
  saveSnapshot(snapshot: RevisionSnapshot): Promise<RevisionSnapshot[]>;
};

class VelvetInkDatabase extends Dexie {
  documents!: Table<EditorDocument, string>;
  snapshots!: Table<RevisionSnapshot, string>;

  constructor() {
    super("velvet-ink-v2");
    this.version(1).stores({
      documents: "id,updatedAt",
      snapshots: "id,documentId,createdAt,reason",
    });
  }
}

class DexieStorage implements WorkspaceStorage {
  usingIndexedDb = true;
  readonly db = new VelvetInkDatabase();

  async loadDocument(): Promise<EditorDocument> {
    const stored = await this.db.documents.get("local-default");
    return cloneJson(normalizeDocument(stored ?? sampleDocument));
  }

  async saveDocument(document: EditorDocument): Promise<void> {
    await this.db.documents.put(cloneJson(document));
  }

  async listSnapshots(): Promise<RevisionSnapshot[]> {
    return (await this.db.snapshots.where("documentId").equals("local-default").sortBy("createdAt")).reverse();
  }

  async saveSnapshot(snapshot: RevisionSnapshot): Promise<RevisionSnapshot[]> {
    await this.db.snapshots.put(cloneJson(snapshot));
    const snapshots = pruneSnapshots(await this.listSnapshots(), SNAPSHOT_LIMIT);
    const idsToKeep = new Set(snapshots.map((item) => item.id));
    const existing = await this.db.snapshots.where("documentId").equals("local-default").toArray();
    const overflowIds = existing.filter((item) => !idsToKeep.has(item.id)).map((item) => item.id);

    if (overflowIds.length > 0) {
      await this.db.snapshots.bulkDelete(overflowIds);
    }

    return snapshots;
  }
}

class LocalStorageFallback implements WorkspaceStorage {
  usingIndexedDb = false;
  private memoryDocument: EditorDocument | null = null;
  private memorySnapshots: RevisionSnapshot[] = [];

  async loadDocument(): Promise<EditorDocument> {
    const raw = readLocalStorage(DOC_KEY);
    if (!raw) {
      return cloneJson(normalizeDocument(this.memoryDocument ?? sampleDocument));
    }

    try {
      return cloneJson(normalizeDocument(JSON.parse(raw) as Partial<EditorDocument>));
    } catch {
      return cloneJson(normalizeDocument(this.memoryDocument ?? sampleDocument));
    }
  }

  async saveDocument(document: EditorDocument): Promise<void> {
    const serialized = JSON.stringify(document);
    const written = writeLocalStorage(DOC_KEY, serialized);
    if (!written) {
      this.memoryDocument = cloneJson(document);
    }
  }

  async listSnapshots(): Promise<RevisionSnapshot[]> {
    const raw = readLocalStorage(SNAPSHOT_KEY);
    if (!raw) {
      return cloneJson(this.memorySnapshots);
    }

    try {
      return pruneSnapshots(JSON.parse(raw) as RevisionSnapshot[], SNAPSHOT_LIMIT);
    } catch {
      return cloneJson(this.memorySnapshots);
    }
  }

  async saveSnapshot(snapshot: RevisionSnapshot): Promise<RevisionSnapshot[]> {
    const snapshots = pruneSnapshots([snapshot, ...(await this.listSnapshots())], SNAPSHOT_LIMIT);
    const serialized = JSON.stringify(snapshots);
    const written = writeLocalStorage(SNAPSHOT_KEY, serialized);
    if (!written) {
      this.memorySnapshots = cloneJson(snapshots);
    }
    return snapshots;
  }
}

let cachedStoragePromise: Promise<WorkspaceStorage> | null = null;

export async function getWorkspaceStorage(forceLocal = false): Promise<WorkspaceStorage> {
  if (forceLocal || shouldSkipIndexedDb()) {
    return new LocalStorageFallback();
  }

  if (!cachedStoragePromise) {
    cachedStoragePromise = (async () => {
      if (typeof indexedDB === "undefined") {
        return new LocalStorageFallback();
      }

      try {
        const storage = new DexieStorage();
        await withTimeout(storage.db.open(), 1_200);
        return storage;
      } catch {
        return new LocalStorageFallback();
      }
    })();
  }

  return cachedStoragePromise;
}

export { LocalStorageFallback };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function shouldSkipIndexedDb() {
  return typeof location !== "undefined" && location.protocol === "file:";
}

function readLocalStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function normalizeDocument(document: Partial<EditorDocument>): EditorDocument {
  const merged = {
    ...sampleDocument,
    ...document,
  };

  return {
    ...merged,
    wordGoal: normalizeGoal(merged.wordGoal, sampleDocument.wordGoal, 100, 20_000),
    characterGoal: normalizeGoal(merged.characterGoal, sampleDocument.characterGoal, 100, 200_000),
    accent: VALID_ACCENTS.has(merged.accent) ? merged.accent : sampleDocument.accent,
    focusMode: typeof merged.focusMode === "boolean" ? merged.focusMode : sampleDocument.focusMode,
    typewriterMode: typeof merged.typewriterMode === "boolean" ? merged.typewriterMode : sampleDocument.typewriterMode,
    updatedAt: typeof merged.updatedAt === "string" && merged.updatedAt.length > 0 ? merged.updatedAt : new Date().toISOString(),
  };
}

function normalizeGoal(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Storage initialization timed out."));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}
