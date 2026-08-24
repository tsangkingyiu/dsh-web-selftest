import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
export interface WebResultSummary {
    bytes?: number;
    width?: number;
    height?: number;
    action?: string;
    path?: string;
    sessionId?: string;
}
export declare function webResultSummaryOf(block: ToolCallViewProps['block']): WebResultSummary | undefined;
export declare function webResultTextOf(block: ToolCallViewProps['block']): string | null;
//# sourceMappingURL=result.d.ts.map