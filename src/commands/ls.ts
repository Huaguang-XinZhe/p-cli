import { Command } from "commander";
import pc from "picocolors";

import { listProjects } from "../core/project";
import { brand, formatRelativeTime, printInfo } from "../utils/ui";

export const lsCommand = new Command("ls")
	.alias("list")
	.description("列出所有项目")
	.action(async () => {
		const projects = listProjects();

		if (projects.length === 0) {
			console.log();
			printInfo(`暂无项目，使用 ${brand.primary("p new")} 创建新项目`);
			console.log();
			return;
		}

		console.log();
		console.log(
			brand.primary("  📂 项目列表") + pc.dim(` (${projects.length} 个)`),
		);
		console.log(pc.dim("  ─".repeat(20)));
		console.log();

		for (const project of projects) {
			const timeStr = formatRelativeTime(project.modifiedAt);
			const templateTag = project.template
				? pc.cyan(` [${project.template}]`)
				: pc.dim(" [空项目]");

			console.log(
				"  " +
					brand.secondary("◆") +
					" " +
					brand.bold(project.name) +
					templateTag +
					pc.dim(`  ${timeStr}`),
			);
			console.log(pc.dim(`    ${project.path}`));
			console.log();
		}

		console.log(
			pc.dim("  提示: 使用 ") + brand.primary("p open") + pc.dim(" 打开项目"),
		);
		console.log();
	});
