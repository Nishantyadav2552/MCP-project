import { ElementType } from "@canva-cursor/shared";

export interface ElementFingerprintInput {
  pageId: string;
  zIndex: number;
  type: ElementType;
  top: number;
  left: number;
  textSnippet?: string;
}

/**
 * Manages stable, persistent element handle IDs for Canva elements.
 * Maps in-memory element references to persistent handles throughout the editing session.
 */
export class ElementHandleRegistry {
  private idToRefMap = new Map<string, unknown>();
  private refToIdMap = new Map<unknown, string>();
  private counter = 0;

  /**
   * Generates or retrieves the existing stable ID for an element instance.
   * If the element was previously seen in this session, its ID is preserved across mutations.
   */
  public getOrCreateHandleId(elementRef: unknown, input: ElementFingerprintInput): string {
    const existingId = this.refToIdMap.get(elementRef);
    if (existingId) {
      return existingId;
    }

    const textHash = input.textSnippet
      ? this.simpleHash(input.textSnippet.trim().slice(0, 30))
      : "item";
    
    this.counter++;
    const handleId = `elem_${input.type}_${input.zIndex}_${textHash}_${this.counter}`;
    
    this.register(handleId, elementRef);
    return handleId;
  }

  /**
   * Explicitly registers a handle ID with an element reference.
   */
  public register(handleId: string, elementRef: unknown): void {
    this.idToRefMap.set(handleId, elementRef);
    this.refToIdMap.set(elementRef, handleId);
  }

  /**
   * Resolves a handle ID to its live element reference.
   */
  public getRef<T = unknown>(handleId: string): T | undefined {
    return this.idToRefMap.get(handleId) as T | undefined;
  }

  /**
   * Resolves an element reference to its handle ID.
   */
  public getId(elementRef: unknown): string | undefined {
    return this.refToIdMap.get(elementRef);
  }

  /**
   * Clears registry when loading a completely different design.
   */
  public clear(): void {
    this.idToRefMap.clear();
    this.refToIdMap.clear();
    this.counter = 0;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36).slice(0, 6);
  }
}
