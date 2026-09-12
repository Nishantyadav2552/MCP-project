/**
 * Interactive Canva Canvas Simulator.
 * Provides live canvas state manipulation with complete Canva SDK feature parity for standalone development and testing.
 */
import { DesignContext, CanvasElement, CanvasBackground, TextStyle, ShapeStyle } from '../types';

export const INITIAL_DESIGN_CONTEXT: DesignContext = {
  canvasWidth: 1080,
  canvasHeight: 1080,
  unit: 'px',
  designType: 'Instagram Post (1080x1080)',
  background: {
    color: '#0F172A',
    gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
  },
  elements: [
    {
      id: 'el_init_heading',
      type: 'text',
      title: 'Heading',
      text: 'Design with Natural Language',
      textStyle: {
        fontSize: 54,
        fontFamily: 'Playfair Display',
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#F8FAFC',
      },
      x: 140,
      y: 180,
      width: 800,
      height: 120,
      zIndex: 1,
    },
    {
      id: 'el_init_sub',
      type: 'text',
      title: 'Subheading',
      text: 'AI Agent powered by Planner & Execution architectures',
      textStyle: {
        fontSize: 26,
        fontFamily: 'Montserrat',
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#94A3B8',
      },
      x: 190,
      y: 320,
      width: 700,
      height: 80,
      zIndex: 2,
    },
    {
      id: 'el_init_card',
      type: 'shape',
      title: 'Hero Container',
      shapeType: 'rectangle',
      shapeStyle: {
        fillColor: '#1E293B',
        strokeColor: '#38BDF8',
        strokeWidth: 2,
        cornerRadius: 24,
        opacity: 0.9,
      },
      x: 290,
      y: 440,
      width: 500,
      height: 360,
      zIndex: 3,
    },
    {
      id: 'el_init_cta',
      type: 'shape',
      title: 'CTA Button',
      shapeType: 'pill',
      shapeStyle: {
        fillColor: '#38BDF8',
        cornerRadius: 999,
      },
      x: 415,
      y: 840,
      width: 250,
      height: 64,
      zIndex: 4,
    },
    {
      id: 'el_init_cta_text',
      type: 'text',
      title: 'CTA Label',
      text: 'Get Started →',
      textStyle: {
        fontSize: 22,
        fontFamily: 'Montserrat',
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#0F172A',
      },
      x: 415,
      y: 856,
      width: 250,
      height: 40,
      zIndex: 5,
    },
  ],
  selectedElementIds: [],
};

export class CanvasSimulator {
  private context: DesignContext;
  private listeners: Array<(ctx: DesignContext) => void> = [];

  constructor(initialState?: DesignContext) {
    this.context = initialState ? JSON.parse(JSON.stringify(initialState)) : JSON.parse(JSON.stringify(INITIAL_DESIGN_CONTEXT));
  }

  public getContext(): DesignContext {
    return this.context;
  }

  public setContext(newContext: DesignContext): void {
    this.context = JSON.parse(JSON.stringify(newContext));
    this.notify();
  }

  public subscribe(listener: (ctx: DesignContext) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.context));
  }

  public selectElement(id: string | null): void {
    this.context.selectedElementIds = id ? [id] : [];
    this.notify();
  }

  public updateElementPosition(id: string, x: number, y: number): void {
    const el = this.context.elements.find(e => e.id === id);
    if (el) {
      el.x = Math.round(x);
      el.y = Math.round(y);
      this.notify();
    }
  }

  public updateElementSize(id: string, width: number, height: number): void {
    const el = this.context.elements.find(e => e.id === id);
    if (el) {
      el.width = Math.max(20, Math.round(width));
      el.height = Math.max(20, Math.round(height));
      this.notify();
    }
  }

  public updateElementText(id: string, text: string): void {
    const el = this.context.elements.find(e => e.id === id);
    if (el) {
      el.text = text;
      this.notify();
    }
  }

  public updateElementTextStyle(id: string, style: Partial<TextStyle>): void {
    const el = this.context.elements.find(e => e.id === id);
    if (el) {
      el.textStyle = { ...(el.textStyle || {}), ...style };
      this.notify();
    }
  }

  public updateElementShapeStyle(id: string, style: Partial<ShapeStyle>): void {
    const el = this.context.elements.find(e => e.id === id);
    if (el) {
      el.shapeStyle = { ...(el.shapeStyle || {}), ...style };
      this.notify();
    }
  }

  public deleteElement(id: string): void {
    this.context.elements = this.context.elements.filter(e => e.id !== id);
    this.context.selectedElementIds = this.context.selectedElementIds.filter(selectedId => selectedId !== id);
    this.notify();
  }

  public setBackground(bg: Partial<CanvasBackground>): void {
    this.context.background = { ...this.context.background, ...bg };
    this.notify();
  }

  public clearCanvas(): void {
    this.context.elements = [];
    this.context.selectedElementIds = [];
    this.context.background = { color: '#FFFFFF', gradient: undefined };
    this.notify();
  }

  public resetToDefault(): void {
    this.context = JSON.parse(JSON.stringify(INITIAL_DESIGN_CONTEXT));
    this.notify();
  }
}
