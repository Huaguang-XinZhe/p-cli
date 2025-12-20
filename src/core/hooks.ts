import { join } from "node:path";
import fse from "fs-extra";
import pc from "picocolors";
import type { Config, HookDefinition } from "../types";
import { HOOKS_DIR } from "../utils/paths";
import { execInDir } from "../utils/shell";
import { brand } from "../utils/ui";

/**
 * 执行单个 hook
 */
async function executeHook(
	hookKey: string,
	hookDef: HookDefinition,
	projectPath: string,
	projectName: string,
	templateName: string,
): Promise<boolean> {
	console.log();
	console.log(pc.dim("  ▸ ") + brand.secondary(hookDef.name));

	try {
		if (hookDef.command) {
			// 命令模式
			const command = hookDef.command;
			// 不内置跳过逻辑，要求用户根据实际情况配置 hook❗
			await execInDir(command, projectPath);
		} else if (hookDef.file) {
			// 脚本模式 - 使用文件名（必须是 .js），在 hooks 目录下查找
			if (!hookDef.file.endsWith(".js")) {
				console.log(pc.yellow(`    脚本文件必须是 .js 格式: ${hookDef.file}`));
				return false;
			}

			const scriptPath = join(HOOKS_DIR, hookDef.file);

			if (!fse.existsSync(scriptPath)) {
				console.log(pc.yellow(`    脚本不存在: ${hookDef.file}`));
				return false;
			}

			await execInDir(
				`node ${scriptPath} ${projectPath} ${projectName} ${templateName}`,
				projectPath,
			);
		} else {
			console.log(pc.yellow(`    Hook ${hookKey} 没有配置 command 或 file`));
			return false;
		}

		return true;
	} catch (error) {
		console.log(pc.red(`    执行失败: ${(error as Error).message}`));
		return false;
	}
}

/**
 * 执行项目创建后的 hooks
 */
export async function runHooks(
	config: Config,
	templateKey: string,
	projectPath: string,
	projectName: string,
): Promise<string[]> {
	const template = config.templates[templateKey];
	const executedHooks: string[] = [];

	// 如果模板没有声明 hooks，则不执行任何 hook
	if (!template?.hooks || template.hooks.length === 0) {
		return executedHooks;
	}

	console.log();
	console.log(pc.dim("  执行 Hooks:"));

	// 按模板中声明的顺序执行 hooks
	for (const hookKey of template.hooks) {
		const hookDef = config.hooks[hookKey];

		if (!hookDef) {
			console.log();
			console.log(pc.dim("  ▸ ") + pc.yellow(`未知 Hook: ${hookKey}`));
			continue;
		}

		const success = await executeHook(
			hookKey,
			hookDef,
			projectPath,
			projectName,
			templateKey,
		);
		if (success) {
			executedHooks.push(hookKey);
		}
	}

	return executedHooks;
}
