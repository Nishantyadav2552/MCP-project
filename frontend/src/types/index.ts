/**
 * Type definitions for Canva AI Design Agent.
 */

export type ElementType = 'text' | 'shape' | 'image' | 'line' | 'table';
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'badge' | 'pill' | 'star';
export type TextAlignment = 'start' | 'center' | 'end' | 'justify';
export type FontWeight = 'normal' | 'bold' | '500' | '600' | '700' | '800';
export type FontStyle = 'normal' | 'italic';

export interface TextStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  textAlign?: TextAlignment;
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
}

export interface ShapeStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  text?: string;
  textStyle?: TextStyle;
  shapeType?: ShapeType;
  shapeStyle?: ShapeStyle;
  imageUrl?: string;
  altText?: string;
}

export interface CanvasBackground {
  color?: string;
  gradient?: string;
  imageUrl?: string;
}

export interface DesignContext {
  canvasWidth: number;
  canvasHeight: number;
  unit: string;
  designType?: string;
  background: CanvasBackground;
  elements: CanvasElement[];
  selectedElementIds: string[];
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface TaskItem {
  id: string;
  action: string;
  description: string;
  parameters: Record<string, any>;
  status: TaskStatus;
  error?: string;
  result?: Record<string, any>;
}

export interface Plan {
  goal: string;
  reasoning?: string;
  tasks: TaskItem[];
  is_supported: boolean;
  unsupported_reason?: string;
  suggested_alternatives?: string[];
}

export interface TaskExecutionRecord {
  task_id: string;
  action: string;
  description: string;
  status: TaskStatus;
  tool_name: string;
  input_parameters: Record<string, any>;
  output_result?: Record<string, any>;
  error_message?: string;
  execution_time_ms: number;
}

export interface PlanExecutionResult {
  success: boolean;
  tasks_completed: number;
  tasks_failed: number;
  tasks_total: number;
  records: TaskExecutionRecord[];
  final_message: string;
  design_delta?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  plan?: Plan;
  execution?: PlanExecutionResult;
  timestamp: string;
  isStreaming?: boolean;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  design_context?: DesignContext;
  auto_execute?: boolean;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  plan?: Plan;
  execution?: PlanExecutionResult;
  updated_design_context?: DesignContext;
  applied_operations?: Array<{
    tool: string;
    parameters: Record<string, any>;
    result?: Record<string, any>;
  }>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  tags: string[];
}
