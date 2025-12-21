import { join } from "node:path";
import fse from "fs-extra";
import pc from "picocolors";
import type { TemplateConfig } from "../types";
import { TEMPLATES_DIR } from "../utils/paths";
import { execInDir } from "../utils/shell";
import { brand } from "../utils/ui";

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
	return Object.entries(templates).map(([key, template]) => ({
		value: key,
		label: template.name,
		hint: template.command ? "命令模式" : "本地模板",
	}));
}
