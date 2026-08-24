import { WebHostController } from './web-host.js';
import { createWebTools, WEB_TOOL_NAMES } from './tools.js';
import { registerWebSkill } from './skill.js';
import { installStreamRoutes } from './stream-routes.js';
export const name = 'dsh-web-selftest';
export const inject = ['tools'];
export function apply(ctx) {
    const hostCtx = ctx;
    const host = new WebHostController();
    const tools = createWebTools(host);
    const disposers = [];
    disposers.push(registerWebSkill(ctx));
    for (const tool of Object.values(tools)) {
        disposers.push(ctx.effect(() => hostCtx.tools.register(tool), `dsh-web-selftest:${tool.name}`));
    }
    installStreamRoutes(ctx, host);
    ctx.logger.info(`dsh-web-selftest mounted (${WEB_TOOL_NAMES.join(' + ')})`);
    return async () => {
        for (const dispose of disposers.reverse())
            await dispose();
        await host.dispose();
    };
}
//# sourceMappingURL=index.js.map