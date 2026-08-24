import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { WebHostController } from './web-host.js';
export declare const WEB_TOOL_NAMES: readonly ["web_launch", "web_close", "web_navigate", "web_snapshot", "web_screenshot", "web_interact", "web_wait_for", "web_console"];
export type WebTools = {
    webLaunch: ToolDefinition;
    webClose: ToolDefinition;
    webNavigate: ToolDefinition;
    webSnapshot: ToolDefinition;
    webScreenshot: ToolDefinition;
    webInteract: ToolDefinition;
    webWaitFor: ToolDefinition;
    webConsole: ToolDefinition;
};
export declare function createWebTools(host: WebHostController): WebTools;
//# sourceMappingURL=tools.d.ts.map