import { ICanvaAdapter, CanvaSDKAdapter, SimulationCanvaAdapter } from "@canva-cursor/canva-adapter";
import { CanvaMcpService } from "@canva-cursor/mcp-server";
import { AgentExecutor } from "@canva-cursor/agent";
import { DesignDataResponse, AgentExecutionReport } from "../types.js";

/**
 * Detects whether the app is executing inside the official Canva editor iframe.
 */
export function isRunningInCanva(): boolean {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true; // If access to window.top is blocked by cross-origin, we are in an iframe
  }
}

class CanvaAppRuntimeService {
  private adapter: ICanvaAdapter;
  private mcpService: CanvaMcpService;
  private agent: AgentExecutor;
  public readonly isCanvaEnvironment: boolean;

  constructor() {
    this.isCanvaEnvironment = isRunningInCanva();

    // Use live Canva SDK adapter inside Canva, or high-fidelity simulation in standalone dev mode
    if (this.isCanvaEnvironment) {
      this.adapter = new CanvaSDKAdapter();
    } else {
      this.adapter = new SimulationCanvaAdapter();
    }

    this.mcpService = new CanvaMcpService(this.adapter);
    this.agent = new AgentExecutor(this.mcpService);
  }

  public getAdapter(): ICanvaAdapter {
    return this.adapter;
  }

  public async getDesignData(): Promise<DesignDataResponse> {
    const { snapshot, graph } = await this.mcpService.getOrRefreshGraph();
    return {
      snapshot,
      graph: graph.toJSON(),
    };
  }

  public async executeInstruction(
    instruction: string,
    confirmed = false
  ): Promise<AgentExecutionReport> {
    return this.agent.execute(instruction, { confirmed });
  }

  public getHistory() {
    return this.mcpService.getHistory(30);
  }

  public async rollback(): Promise<{ success: boolean }> {
    const history = this.mcpService.getHistory(1);
    if (history.length === 0) {
      throw new Error("No operations to roll back.");
    }

    const lastOp = history[0];
    if (!lastOp.previousValue || !lastOp.targetElementId) {
      throw new Error("Last operation does not have a recorded rollback state.");
    }

    const op = lastOp.operation;
    if (op.type === "update_text_color" && lastOp.previousValue.color) {
      await this.mcpService.executeOperation({
        type: "update_text_color",
        targetElementId: lastOp.targetElementId,
        color: String(lastOp.previousValue.color),
      });
    } else if (op.type === "move_element" && lastOp.previousValue.top !== undefined) {
      await this.mcpService.executeOperation({
        type: "move_element",
        targetElementId: lastOp.targetElementId,
        position: {
          top: Number(lastOp.previousValue.top),
          left: Number(lastOp.previousValue.left),
        },
      });
    } else if (op.type === "update_font_size" && lastOp.previousValue.fontSize) {
      await this.mcpService.executeOperation({
        type: "update_font_size",
        targetElementId: lastOp.targetElementId,
        fontSize: Number(lastOp.previousValue.fontSize),
      });
    } else {
      throw new Error("Unsupported rollback operation type.");
    }

    return { success: true };
  }

  public async reset(): Promise<DesignDataResponse> {
    this.adapter = new SimulationCanvaAdapter();
    this.mcpService.setAdapter(this.adapter);
    return this.getDesignData();
  }
}

export const canvaRuntime = new CanvaAppRuntimeService();
