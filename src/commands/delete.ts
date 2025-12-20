import {
	confirm,
	intro,
	isCancel,
	outro,
	select,
	spinner,
} from "@clack/prompts";
import { Command } from "commander";
import fse from "fs-extra";
import pc from "picocolors";

import {
	clearAllProjectMeta,
	deleteProjectMeta,
	getProjectPath,
	listProjects,
	projectExists,
} from "../core/project";
import { bgOrange, brand, printError, printInfo } from "../utils/ui";

export const deleteCommand = new Command("delete")
	.alias("rm")
	.description("删除项目")
	.argument("[name]", "项目名称（使用 'all' 删除所有项目）")
	.action(async (name?: string) => {
		const projects = listProjects();

		if (projects.length === 0) {
			console.log();
			printInfo("暂无项目");
			console.log();
			return;
		}

		// 处理 delete all 命令
		if (name === "all") {
			intro(bgOrange(" 删除所有项目 "));

			console.log();
			console.log(pc.dim("  将要删除的项目:"));
			for (const project of projects) {
				const templateInfo = project?.template
					? pc.cyan(` (${project.template})`)
					: "";
				console.log(`  ${brand.secondary("•")} ${project.name}${templateInfo}`);
			}
			console.log();

			// 确认删除
			const shouldDelete = await confirm({
				message: `确定要删除 ${brand.primary(String(projects.length))} 个项目吗？此操作不可恢复！`,
				initialValue: false,
			});

			if (isCancel(shouldDelete) || !shouldDelete) {
				outro(pc.dim("已取消"));
				process.exit(0);
			}

			console.log();
			const s = spinner();
			s.start("正在删除项目...");

			// 并发删除所有项目
			const results = await Promise.allSettled(
				projects.map(async (project, index) => {
					try {
						await fse.remove(project.path);
						return { success: true, project, index };
					} catch (error) {
						const err = error as Error;
						return { success: false, project, error: err.message, index };
					}
				}),
			);

			s.stop();

			// 统计结果并显示
			console.log();
			let deletedCount = 0;
			const errors: string[] = [];

			// 按索引排序结果以保持显示顺序
			const sortedResults = results
				.map((result, idx) => ({ result, originalIndex: idx }))
				.sort((a, b) => {
					const aIndex =
						a.result.status === "fulfilled"
							? a.result.value.index
							: a.originalIndex;
					const bIndex =
						b.result.status === "fulfilled"
							? b.result.value.index
							: b.originalIndex;
					return aIndex - bIndex;
				});

			for (const { result } of sortedResults) {
				if (result.status === "fulfilled") {
					if (result.value.success) {
						deletedCount++;
						console.log(
							`  ${brand.success("✓")} [${result.value.index + 1}/${projects.length}] ${result.value.project.name}`,
						);
					} else {
						errors.push(`${result.value.project.name}: ${result.value.error}`);
						console.log(
							`  ${brand.error("✗")} [${result.value.index + 1}/${projects.length}] ${result.value.project.name} - ${result.value.error}`,
						);
					}
				} else {
					errors.push(`删除失败: ${result.reason}`);
				}
			}

			// 清除所有元数据
			clearAllProjectMeta();

			console.log();
			if (errors.length > 0) {
				outro(
					`${brand.success("✓")} 已删除 ${deletedCount} 个项目，${errors.length} 个失败`,
				);
			} else {
				outro(`${brand.success("✓")} 已成功删除所有 ${deletedCount} 个项目`);
			}

			return;
		}

		let projectName = name;

		// 如果没有提供项目名，显示选择菜单
		if (!projectName) {
			intro(bgOrange(" 删除项目 "));

			const result = await select({
				message: "请选择要删除的项目:",
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

		// 确认删除
		const shouldDelete = await confirm({
			message: `确定要删除项目 ${brand.primary(projectName)} 吗？此操作不可恢复！`,
			initialValue: false,
		});

		if (isCancel(shouldDelete) || !shouldDelete) {
			outro(pc.dim("已取消"));
			process.exit(0);
		}

		const s = spinner();
		s.start(`正在删除 ${projectName}...`);

		try {
			await fse.remove(projectPath);
			// 删除元数据
			deleteProjectMeta(projectName);
			s.stop(`${brand.success("✓")} 已删除: ${brand.primary(projectName)}`);
		} catch (error) {
			s.stop("删除失败");
			const err = error as Error;
			printError(err.message);
			process.exit(1);
		}
	});
