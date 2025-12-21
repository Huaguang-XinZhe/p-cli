import { join } from "node:path";
import fse from "fs-extra";
import pc from "picocolors";
import type { TemplateConfig } from "../types";
import { TEMPLATES_DIR } from "../utils/paths";
import { execInDir } from "../utils/shell";
import { brand } from "../utils/ui";

/**
 * 获取本地模板目录列表
 */
export async function getLocalTemplates(): Promise<
	Record<string, TemplateConfig>
> {
	const localTemplates: Record<string, TemplateConfig> = {};

	if (!(await fse.pathExists(TEMPLATES_DIR))) {
		return localTemplates;
	}

	const entries = await fse.readdir(TEMPLATES_DIR, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isDirectory()) {
			// 自动注册本地模板
			localTemplates[entry.name] = {
				name: entry.name,
				dir: entry.name,
			};
		}
	}

	return localTemplates;
}

/**
 * 合并配置中的模板和本地模板
 */
export async function getAllTemplates(
	configTemplates: Record<string, TemplateConfig>,
): Promise<Record<string, TemplateConfig>> {
	const localTemplates = await getLocalTemplates();

	// 配置中的模板优先级更高（可以覆盖本地模板的配置）
	return {
		...localTemplates,
		...configTemplates,
	};
}

/**
 * 应用模板到项目目录
 */
export async function applyTemplate(
	template: TemplateConfig,
	projectPath: string,
): Promise<{ success: boolean; message: string }> {
	// 确保项目目录存在
	await fse.ensureDir(projectPath);

	// 命令模式
	if (template.command) {
		console.log();
		console.log(pc.dim("  执行模板命令:"));

		const result = await execInDir(template.command, projectPath);

		if (!result.success) {
			return {
				success: false,
				message: `模板命令执行失败`,
			};
		}

		console.log();
		return { success: true, message: "模板应用成功" };
	}

	// 本地模板模式 - 使用 dir 字段指定文件夹名，在 templates 目录下查找
	if (template.dir) {
		const templatePath = join(TEMPLATES_DIR, template.dir);

		if (!(await fse.pathExists(templatePath))) {
			return {
				success: false,
				message: `模板目录不存在: ${template.dir}（在 ${TEMPLATES_DIR} 中查找）`,
			};
		}

		console.log();
		console.log(pc.dim("  复制模板文件:"));
		console.log(
			pc.dim("  $ ") +
				brand.secondary(`cp -r ${templatePath}/* ${projectPath}/`),
		);

		try {
			await fse.copy(templatePath, projectPath, { overwrite: true });
			console.log(pc.dim("    ") + brand.success("✓") + pc.dim(" 复制完成"));
			console.log();
			return { success: true, message: "模板复制成功" };
		} catch (error) {
			const err = error as Error;
			console.log(pc.red(`    ${err.message}`));
			return {
				success: false,
				message: `模板复制失败: ${err.message}`,
			};
		}
	}

	// 仅 hooks 模式 - 如果只有 hooks 而没有 command 或 dir，也是有效的
	if (template.hooks && template.hooks.length > 0) {
		return { success: true, message: "模板配置有效（仅执行 hooks）" };
	}

	return {
		success: false,
		message: "模板配置无效（需要 command、dir 或 hooks）",
	};
}

/**
 * 获取模板列表供选择
 */
export function getTemplateChoices(
	templates: Record<string, TemplateConfig>,
): Array<{ value: string; label: string; hint?: string }> {
	return Object.entries(templates).map(([key, template]) => {
		let hint: string | undefined;
		if (template.command) {
			hint = "命令模式";
		} else if (template.dir) {
			hint = "本地模板";
		}
		return {
			value: key,
			label: template.name,
			hint,
		};
	});
}
