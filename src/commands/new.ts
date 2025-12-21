import { intro, isCancel, outro, select, spinner, text } from "@clack/prompts";
import { Command } from "commander";
import fse from "fs-extra";
import pc from "picocolors";

import { loadConfig } from "../core/config";
import { runHooks } from "../core/hooks";
import {
	getProjectPath,
	saveProjectMeta,
	validateProjectName,
} from "../core/project";
import {
	applyTemplate,
	getAllTemplates,
	getTemplateChoices,
} from "../core/template";
import { openWithIDE } from "../utils/shell";
import { bgOrange, brand, printError } from "../utils/ui";

export const newCommand = new Command("new")
	.alias("create")
	.description("创建新项目")
	.argument("[name]", "项目名称")
	.option("-t, --template [template]", "使用指定模板")
	.action(async (name?: string, options?: { template?: string | boolean }) => {
		const config = loadConfig();
		const allTemplates = await getAllTemplates(config.templates);

		// 快速模式：只有项目名，没有 -t 参数 → 使用 empty 模板
		const isQuickMode = name && !options?.template;

		if (isQuickMode) {
			// 验证项目名称
			const validation = validateProjectName(name);
			if (!validation.valid) {
				printError(validation.message!);
				process.exit(1);
			}

			const projectPath = getProjectPath(name);

			// 创建空目录
			try {
				await fse.ensureDir(projectPath);
			} catch (error) {
				const err = error as Error;
				printError(err.message);
				process.exit(1);
			}

			// 执行 empty 模板的 hooks
			const emptyTemplate = config.templates.empty;

			if (emptyTemplate?.hooks && emptyTemplate.hooks.length > 0) {
				await runHooks(config, "empty", projectPath, name);
			}

			// 保存项目元数据
			saveProjectMeta(name, { template: "empty" });

			// 打开 IDE
			try {
				await openWithIDE(config.ide, projectPath);
				console.log(
					brand.success("✓") +
						" " +
						brand.primary(name) +
						pc.dim(" 已创建并打开"),
				);
			} catch (error) {
				console.log();
				printError((error as Error).message);
				console.log();
				console.log(pc.dim("  项目路径: ") + pc.underline(projectPath));
				console.log();
			}
			return;
		}

		// 交互模式
		intro(bgOrange(" 创建新项目 "));

		// 1. 获取项目名称
		let projectName = name;
		if (!projectName) {
			const result = await text({
				message: "请输入项目名称:",
				placeholder: "my-awesome-project",
				validate: (value) => {
					const validation = validateProjectName(value);
					if (!validation.valid) return validation.message;
				},
			});

			if (isCancel(result)) {
				outro(pc.dim("已取消"));
				process.exit(0);
			}
			projectName = result as string;
		} else {
			// 验证传入的名称
			const validation = validateProjectName(projectName);
			if (!validation.valid) {
				printError(validation.message!);
				process.exit(1);
			}
		}

		// 2. 获取模板
		let templateKey: string;
		const templateChoices = getTemplateChoices(allTemplates);

		if (options?.template === true || options?.template === "") {
			// -t 没有值，显示选择菜单
			const result = await select({
				message: "请选择项目模板:",
				options: templateChoices,
			});

			if (isCancel(result)) {
				outro(pc.dim("已取消"));
				process.exit(0);
			}
			templateKey = result as string;
		} else if (options?.template) {
			// -t 有值
			templateKey = options.template;
			if (!allTemplates[templateKey]) {
				printError(`模板不存在: ${templateKey}`);
				console.log(
					pc.dim(`可用模板: ${Object.keys(allTemplates).join(", ")}`),
				);
				process.exit(1);
			}
		} else {
			// 没有 -t 参数但进入了交互模式（没有项目名）
			const result = await select({
				message: "请选择项目模板:",
				options: templateChoices,
			});

			if (isCancel(result)) {
				outro(pc.dim("已取消"));
				process.exit(0);
			}
			templateKey = result as string;
		}

		const template = allTemplates[templateKey];
		if (!template) {
			printError(`模板不存在: ${templateKey}`);
			process.exit(1);
		}

		const projectPath = getProjectPath(projectName);

		// 3. 显示信息
		console.log();
		console.log(pc.dim("  项目名称: ") + brand.primary(projectName));
		console.log(pc.dim("  使用模板: ") + brand.secondary(template.name));
		console.log(pc.dim("  项目路径: ") + pc.dim(projectPath));

		// 4. 创建项目目录
		try {
			await fse.ensureDir(projectPath);
		} catch (error) {
			const err = error as Error;
			printError(err.message);
			process.exit(1);
		}

		// 5. 应用模板（显示命令和输出）
		const templateResult = await applyTemplate(template, projectPath);

		if (!templateResult.success) {
			// 模板应用失败，删除已创建的项目目录
			try {
				await fse.remove(projectPath);
			} catch {
				// 忽略删除失败的错误，继续显示模板应用失败的错误
			}
			printError(templateResult.message);
			process.exit(1);
		}

		// 6. 执行 hooks（显示命令和输出）
		await runHooks(config, templateKey, projectPath, projectName);

		// 7. 保存项目元数据
		saveProjectMeta(projectName, { template: templateKey });

		// 8. 打开 IDE
		console.log();
		const s = spinner();
		s.start(`正在打开 ${config.ide}...`);
		try {
			await openWithIDE(config.ide, projectPath);
			s.stop(`${config.ide} 已打开`);
		} catch (error) {
			s.stop(`打开 ${config.ide} 失败`);
			console.log();
			printError((error as Error).message);
			console.log();
			console.log(pc.dim("  项目路径: ") + pc.underline(projectPath));
		}

		// 9. 完成
		outro(brand.success("✨ 项目创建成功！"));
	});
