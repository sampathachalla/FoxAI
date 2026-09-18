/**
 * DOM, Canvas 2D, LocalStorage, and Web Audio API Mock Harness for Fox AI Testing
 */

export class MockLocalStorage implements Storage {
  private store: Map<string, string> = new Map();
  public quotaErrorTrigger: boolean = false;

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.quotaErrorTrigger) {
      const err = new Error('QuotaExceededError: DOMException 22');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(key, String(value));
  }

  // Helper for test assertions
  dump(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of this.store.entries()) {
      result[k] = v;
    }
    return result;
  }
}

export interface DrawCall {
  type: string;
  args: any[];
}

export class MockCanvasRenderingContext2D {
  public drawCalls: DrawCall[] = [];
  public fillStyle: string | any = '#ffffff';
  public strokeStyle: string | any = '#ffffff';
  public lineWidth: number = 1;
  public globalAlpha: number = 1;
  public globalCompositeOperation: string = 'source-over';
  public shadowColor: string = '';
  public shadowBlur: number = 0;

  private stateStack: any[] = [];

  save(): void {
    this.stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha,
      globalCompositeOperation: this.globalCompositeOperation,
    });
    this.drawCalls.push({ type: 'save', args: [] });
  }

  restore(): void {
    const prev = this.stateStack.pop();
    if (prev) {
      this.fillStyle = prev.fillStyle;
      this.strokeStyle = prev.strokeStyle;
      this.lineWidth = prev.lineWidth;
      this.globalAlpha = prev.globalAlpha;
      this.globalCompositeOperation = prev.globalCompositeOperation;
    }
    this.drawCalls.push({ type: 'restore', args: [] });
  }

  scale(x: number, y: number): void {
    this.drawCalls.push({ type: 'scale', args: [x, y] });
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.drawCalls.push({ type: 'clearRect', args: [x, y, w, h] });
  }

  beginPath(): void {
    this.drawCalls.push({ type: 'beginPath', args: [] });
  }

  closePath(): void {
    this.drawCalls.push({ type: 'closePath', args: [] });
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.drawCalls.push({ type: 'arc', args: [x, y, radius, startAngle, endAngle, counterclockwise] });
  }

  moveTo(x: number, y: number): void {
    this.drawCalls.push({ type: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.drawCalls.push({ type: 'lineTo', args: [x, y] });
  }

  fill(): void {
    this.drawCalls.push({
      type: 'fill',
      args: [this.fillStyle, this.globalAlpha, this.globalCompositeOperation],
    });
  }

  stroke(): void {
    this.drawCalls.push({
      type: 'stroke',
      args: [this.strokeStyle, this.lineWidth, this.globalAlpha, this.globalCompositeOperation],
    });
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.drawCalls.push({ type: 'fillRect', args: [x, y, w, h, this.fillStyle] });
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.drawCalls.push({ type: 'rect', args: [x, y, w, h] });
  }

  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    this.drawCalls.push({
      type: 'ellipse',
      args: [x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise],
    });
  }

  translate(x: number, y: number): void {
    this.drawCalls.push({ type: 'translate', args: [x, y] });
  }

  rotate(angle: number): void {
    this.drawCalls.push({ type: 'rotate', args: [angle] });
  }

  clip(): void {
    this.drawCalls.push({ type: 'clip', args: [] });
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.drawCalls.push({ type: 'quadraticCurveTo', args: [cpx, cpy, x, y] });
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.drawCalls.push({ type: 'bezierCurveTo', args: [cp1x, cp1y, cp2x, cp2y, x, y] });
  }

  roundRect(x: number, y: number, w: number, h: number, radii?: number | number[]): void {
    this.drawCalls.push({ type: 'roundRect', args: [x, y, w, h, radii] });
  }

  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this.drawCalls.push({ type: 'fillText', args: [text, x, y, maxWidth] });
  }

  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    this.drawCalls.push({ type: 'strokeText', args: [text, x, y, maxWidth] });
  }

  measureText(text: string): { width: number } {
    return { width: text.length * 7.5 };
  }

  setLineDash(segments: number[]): void {
    this.drawCalls.push({ type: 'setLineDash', args: [segments] });
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): any {
    const stops: { offset: number; color: string }[] = [];
    return {
      addColorStop(offset: number, color: string) {
        stops.push({ offset, color });
      },
      _stops: stops,
      _coords: [x0, y0, r0, x1, y1, r1],
    };
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): any {
    const stops: { offset: number; color: string }[] = [];
    return {
      addColorStop(offset: number, color: string) {
        stops.push({ offset, color });
      },
      _stops: stops,
      _coords: [x0, y0, x1, y1],
    };
  }

  resetCalls(): void {
    this.drawCalls = [];
  }
}

export class MockHTMLCanvasElement {
  public width: number = 380;
  public height: number = 300;
  public clientWidth: number = 380;
  public clientHeight: number = 300;
  public context2D = new MockCanvasRenderingContext2D();
  private eventListeners: Map<string, Function[]> = new Map();

  getContext(type: string): MockCanvasRenderingContext2D | null {
    if (type === '2d') {
      return this.context2D;
    }
    return null;
  }

  addEventListener(type: string, listener: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    const list = this.eventListeners.get(type);
    if (list) {
      this.eventListeners.set(type, list.filter((l) => l !== listener));
    }
  }

  dispatchEvent(event: { type: string; [key: string]: any }): boolean {
    const list = this.eventListeners.get(event.type);
    if (list) {
      list.forEach((fn) => fn(event));
      return true;
    }
    return false;
  }
}

export function setupTestEnvironment(): {
  localStorage: MockLocalStorage;
  canvas: MockHTMLCanvasElement;
  cleanup: () => void;
} {
  const mockStorage = new MockLocalStorage();
  const mockCanvas = new MockHTMLCanvasElement();

  const originalLocalStorage = (globalThis as any).localStorage;
  const originalWindow = (globalThis as any).window;

  (globalThis as any).localStorage = mockStorage;
  (globalThis as any).window = {
    localStorage: mockStorage,
    devicePixelRatio: 2,
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener: (type: string, fn: Function) => mockCanvas.addEventListener(type, fn),
    removeEventListener: (type: string, fn: Function) => mockCanvas.removeEventListener(type, fn),
    dispatchEvent: (e: any) => mockCanvas.dispatchEvent(e),
  };

  return {
    localStorage: mockStorage,
    canvas: mockCanvas,
    cleanup: () => {
      if (originalLocalStorage) (globalThis as any).localStorage = originalLocalStorage;
      if (originalWindow) (globalThis as any).window = originalWindow;
    },
  };
}
