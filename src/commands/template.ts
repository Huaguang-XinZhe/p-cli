import { join } from "node:path";
import { intro, isCancel, outro, select, spinner } from "@clack/prompts";
import { Command } from "commander";
import fse from "fs-extra";
import pc from "picocolors";

import { loadConfig } from "../core/config";
import { getProjectPath, listProjects, projectExists } from "../core/project";
import { TEMPLATES_DIR } from "../utils/paths";
import { execAndCapture, openWithIDE } from "../utils/shell";
import { bgOrange, brand, printError, printInfo } from "../utils/ui";

/**
 * 检查目录是否是 git 仓库
 */
async function isGitRepo(projectPath: string): Promise<boolean> {
	return await fse.pathExists(join(projectPath, ".git"));
}

/**
 * 检查是否有有效的 .gitignore
 */
async function hasValidGitignore(projectPath: string): Promise<boolean> {
	const gitignorePath = join(projectPath, ".gitignore");
	if (!(await fse.pathExists(gitignorePath))) {
		return false;
	}

	const content = await fse.readFile(gitignorePath, "utf-8");
	return content.trim().length > 0;
}

/**
 * 获取需要复制的文件列表
 */
async function getFilesToCopy(
	projectPath: string,
): Promise<{ success: boolean; files: string[]; message?: string }> {
	const isGit = await isGitRepo(projectPath);
	const hasGitignore = await hasValidGitignore(projectPath);

	// 如果是 git 仓库，直接运行 git ls-files
	if (isGit) {
		const result = await execAndCapture(
			"git ls-files --cached --others --exclude-standard",
			projectPath,
		);

		if (result.success) {
			const files = result.output
				.split("\n")
				.map((f) => f.trim())
				.filter((f) => f.length > 0);
			return { success: true, files };
		}

		return {
			success: false,
			files: [],
			message: "无法获取 git 文件列表",
		};
	}

	// 如果有有效的 .gitignore，先初始化 git，然后获取文件列表
	if (hasGitignore) {
		// 临时初始化 git
		const initResult = await execAndCapture("git init", projectPath);
		if (!initResult.success) {
			return {
				success: false,
				files: [],
				message: "Git 初始化失败",
			};
		}

		const lsResult = await execAndCapture(
			"git ls-files --cached --others --exclude-standard",
			projectPath,
		);

		// 删除临时 .git 目录
		await fse.remove(join(projectPath, ".git"));

		if (lsResult.success) {
			const files = lsResult.output
				.split("\n")
				.map((f) => f.trim())
				.filter((f) => f.length > 0);
			return { success: true, files };
		}

		return {
			success: false,
			files: [],
			message: "无法获取文件列表",
		};
	}

	// 如果没有 .gitignore，使用默认忽略规则
	const defaultIgnores = [
		"node_modules",
		"dist",
		"build",
		".next",
		".nuxt",
		".output",
		"coverage",
		".vscode",
		".idea",
		"*.log",
		".DS_Store",
		"Thumbs.db",
	];

	const files: string[] = [];

	// 递归遍历目录
	async function walk(dir: string, relativePath = "") {
		const entries = await fse.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = join(dir, entry.name);
			const relPath = relativePath
				? `${relativePath}/${entry.name}`
				: entry.name;

			// 检查是否应该忽略
			const shouldIgnore = defaultIgnores.some((pattern) => {
				if (pattern.includes("*")) {
					// 简单的通配符匹配
					const regex = new RegExp(
						`^${pattern.replace(/\*/g, ".*").replace(/\./g, "\\.")}$`,
					);
					return regex.test(entry.name);
				}
				return entry.name === pattern || relPath.includes(`/${pattern}/`);
			});

			if (shouldIgnore) {
				continue;
			}

			if (entry.isDirectory()) {
				await walk(entryPath, relPath);
			} else {
				files.push(relPath);
			}
		}
	}

	await walk(projectPath);
	return { success: true, files };
}

/**
 * 复制文件到模板目录
 */
async function copyFilesToTemplate(
	sourcePath: string,
	targetPath: string,
	files: string[],
): Promise<void> {
	await fse.ensureDir(targetPath);

	for (const file of files) {
		const src = join(sourcePath, file);
		const dest = join(targetPath, file);

		// 确保目标目录存在
		await fse.ensureDir(join(dest, ".."));
		await fse.copy(src, dest);
	}
}

export const templateCommand = new Command("template")
	.alias("templates")
	.description("管理本地模板")
	.argument("[action]", "操作: add")
	.argument("[project-name]", "项目名称（用于 add）")
	.action(async (action?: string, projectName?: string) => {
		// 如果没有提供 action，则打开 templates 目录
		if (!action) {
			const config = loadConfig();

			// 确保 templates 目录存在
			await fse.ensureDir(TEMPLATES_DIR);

			const s = spinner();
			s.start(`正在用 ${config.ide} 打开模板目录...`);

			try {
				await openWithIDE(config.ide, TEMPLATES_DIR);
				s.stop(
					`${brand.success("✓")} 已打开模板目录: ${brand.primary(TEMPLATES_DIR)}`,
				);
			} catch (error) {
				s.stop("打开失败");
				console.log();
				printError((error as Error).message);
				console.log();
				console.log(pc.dim("  模板目录: ") + pc.underline(TEMPLATES_DIR));
				console.log();
				process.exit(1);
			}

			return;
		}

		// 处理 add 操作
		if (action === "add") {
			const projects = listProjects();

			if (projects.length === 0) {
				console.log();
				printInfo(`暂无项目，使用 ${brand.primary("p new")} 创建新项目`);
				console.log();
				return;
			}

			intro(bgOrange(" 添加模板 "));

			let selectedProject = projectName;

			// 如果没有提供项目名，交互式选择
			if (!selectedProject) {
				const result = await select({
					message: "请选择要添加为模板的项目:",
					options: projects.map((p) => ({
						value: p.name,
						label: p.name,
						hint: p.template ? pc.cyan(p.template) : undefined,
					})),
				});

				if (isCancel(result)) {
					outro(pc.dim("已取消"));
					process.exit(0);
				}

				selectedProject = result as string;
			} else {
				// 验证项目是否存在
				if (!projectExists(selectedProject)) {
					printError(`项目不存在: ${selectedProject}`);
					console.log(
						pc.dim("使用 ") + brand.primary("p ls") + pc.dim(" 查看所有项目"),
					);
					process.exit(1);
				}
			}

			const sourcePath = getProjectPath(selectedProject);

			// 获取需要复制的文件
			const s = spinner();
			s.start("正在分析项目文件...");

			const { success, files, message } = await getFilesToCopy(sourcePath);

			if (!success) {
				s.stop("分析失败");
				console.log();
				printError(message || "无法获取文件列表");
				console.log();
				process.exit(1);
			}

			s.stop(
				`${brand.success("✓")} 找到 ${brand.primary(files.length.toString())} 个文件`,
			);

			// 复制文件
			const targetPath = join(TEMPLATES_DIR, selectedProject);

			const copySpinner = spinner();
			copySpinner.start(`正在复制文件到模板目录...`);

			try {
				await copyFilesToTemplate(sourcePath, targetPath, files);
				copySpinner.stop(
					`${brand.success("✓")} 文件已复制到: ${brand.primary(targetPath)}`,
				);
			} catch (error) {
				copySpinner.stop("复制失败");
				console.log();
				printError((error as Error).message);
				console.log();
				process.exit(1);
			}

			console.log();
			outro(
				brand.success(
					`✓ 模板添加成功: ${brand.primary(selectedProject)}（可直接使用）`,
				),
			);
			console.log();
			console.log(
				pc.dim("  提示: 本地模板自动注册，无需在 config.yaml 中声明"),
			);
			console.log(
				pc.dim("  如需挂载 hooks，可在配置中添加: ") +
					brand.secondary(
						`\n\n  templates:\n    ${selectedProject}:\n      name: 模板名称\n      dir: ${selectedProject}\n      hooks:\n        - gitInit`,
					),
			);
			console.log();
		} else {
			printError(`未知操作: ${action}`);
			console.log(pc.dim("  支持的操作: add"));
			process.exit(1);
		}
	});
