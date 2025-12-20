import { intro, isCancel, outro, select, spinner } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";

import { loadConfig } from "../core/config";
import { getProjectPath, listProjects, projectExists } from "../core/project";
import { openWithIDE } from "../utils/shell";
import { bgOrange, brand, printError, printInfo } from "../utils/ui";

export const openCommand = new Command("open")
	.alias("use")
	.description("打开项目")
	.argument("[name]", "项目名称")
	.action(async (name?: string) => {
		const config = loadConfig();
		const projects = listProjects();

		if (projects.length === 0) {
			console.log();
			printInfo(`暂无项目，使用 ${brand.primary("p new")} 创建新项目`);
			console.log();
			return;
		}

		let projectName = name;

		// 如果没有提供项目名，显示选择菜单
		if (!projectName) {
			intro(bgOrange(" 打开项目 "));

			const result = await select({
				message: "请选择要打开的项目:",
				options: projects.map((p) => ({
					value: p.name,
					label: p.name,
					hint: p.template ? pc.cyan(p.template) : pc.dim(p.path),
				})),
			});

			if (isCancel(result)) {
				outro(pc.dim("已取消"));
				process.exit(0);
			}

			projectName = result as string;
		} else {
			// 验证项目是否存在
			if (!projectExists(projectName)) {
				printError(`项目不存在: ${projectName}`);
				console.log(
					pc.dim("使用 ") + brand.primary("p ls") + pc.dim(" 查看所有项目"),
				);
				process.exit(1);
			}
		}

		const projectPath = getProjectPath(projectName);

		const s = spinner();
		s.start(`正在用 ${config.ide} 打开 ${projectName}...`);

		try {
			await openWithIDE(config.ide, projectPath);
			s.stop(`${brand.success("✓")} 已打开: ${brand.primary(projectName)}`);
		} catch (error) {
			s.stop("打开失败");
			console.log();
			printError((error as Error).message);
			console.log();
			console.log(pc.dim("  项目路径: ") + pc.underline(projectPath));
			console.log();
			process.exit(1);
		}
	});
