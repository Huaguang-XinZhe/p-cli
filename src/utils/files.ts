import { join } from "node:path";
import fse from "fs-extra";

import { execAndCapture } from "./shell";

const DEFAULT_IGNORES = [
	".git",
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

async function isGitRepo(projectPath: string): Promise<boolean> {
	return await fse.pathExists(join(projectPath, ".git"));
}

async function hasValidGitignore(projectPath: string): Promise<boolean> {
	const gitignorePath = join(projectPath, ".gitignore");
	if (!(await fse.pathExists(gitignorePath))) {
		return false;
	}

	const content = await fse.readFile(gitignorePath, "utf-8");
	return content.trim().length > 0;
}

export async function collectProjectFiles(
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
	const files: string[] = [];

	// 递归遍历目录
	async function walk(dir: string, relativePath = ""): Promise<void> {
		const entries = await fse.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = join(dir, entry.name);
			const relPath = relativePath
				? `${relativePath}/${entry.name}`
				: entry.name;

			// 检查是否应该忽略
			const shouldIgnore = DEFAULT_IGNORES.some((pattern) => {
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

export async function copyFiles(
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
