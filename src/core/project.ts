import { join } from "node:path";
import fse from "fs-extra";
import type { Metadata, ProjectInfo, ProjectMetaData } from "../types";
import { METADATA_PATH, PROJECTS_DIR } from "../utils/paths";

/**
 * 读取全局元数据
 */
function loadMetadata(): Metadata {
	if (!fse.existsSync(METADATA_PATH)) {
		return { projects: {} };
	}

	try {
		const content = fse.readFileSync(METADATA_PATH, "utf-8");
		return JSON.parse(content);
	} catch {
		return { projects: {} };
	}
}

/**
 * 保存全局元数据
 */
function saveMetadata(metadata: Metadata): void {
	fse.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), "utf-8");
}

/**
 * 获取所有项目列表
 */
export function listProjects(): ProjectInfo[] {
	if (!fse.existsSync(PROJECTS_DIR)) {
		return [];
	}

	const entries = fse.readdirSync(PROJECTS_DIR, { withFileTypes: true });
	const metadata = loadMetadata();
	const projects: ProjectInfo[] = [];

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const projectPath = join(PROJECTS_DIR, entry.name);
			const stat = fse.statSync(projectPath);

			// 读取项目元数据
			const meta = metadata.projects[entry.name];

			projects.push({
				name: entry.name,
				path: projectPath,
				template: meta?.template,
				createdAt: meta?.createdAt ? new Date(meta.createdAt) : stat.birthtime,
				modifiedAt: stat.mtime,
			});
		}
	}

	// 按修改时间降序排列
	return projects.sort(
		(a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime(),
	);
}

/**
 * 获取项目元数据
 */
export function getProjectMeta(projectName: string): ProjectMetaData | null {
	const metadata = loadMetadata();
	return metadata.projects[projectName] || null;
}

/**
 * 保存项目元数据
 */
export function saveProjectMeta(
	projectName: string,
	data: Partial<ProjectMetaData> = {},
): void {
	const metadata = loadMetadata();
	const existing = metadata.projects[projectName];

	metadata.projects[projectName] = {
		template: data.template ?? existing?.template,
		createdAt: existing?.createdAt || new Date().toISOString(),
	};

	saveMetadata(metadata);
}

/**
 * 删除项目元数据
 */
export function deleteProjectMeta(projectName: string): void {
	const metadata = loadMetadata();
	delete metadata.projects[projectName];
	saveMetadata(metadata);
}

/**
 * 清除所有项目元数据
 */
export function clearAllProjectMeta(): void {
	saveMetadata({ projects: {} });
}

/**
 * 检查项目是否存在
 */
export function projectExists(name: string): boolean {
	const projectPath = join(PROJECTS_DIR, name);
	return fse.existsSync(projectPath);
}

/**
 * 获取项目路径
 */
export function getProjectPath(name: string): string {
	return join(PROJECTS_DIR, name);
}

/**
 * 验证项目名称
 */
export function validateProjectName(name: string): {
	valid: boolean;
	message?: string;
} {
	if (!name || name.trim() === "") {
		return { valid: false, message: "项目名称不能为空" };
	}

	// 检查是否包含非法字符
	const invalidChars = /[<>:"/\\|?*]/;
	if (invalidChars.test(name)) {
		return { valid: false, message: "项目名称包含非法字符" };
	}

	// 检查是否以点或空格开头/结尾
	if (name.startsWith(".") || name.startsWith(" ") || name.endsWith(" ")) {
		return { valid: false, message: "项目名称格式不正确" };
	}

	// 检查项目是否已存在
	if (projectExists(name)) {
		return { valid: false, message: "项目已存在" };
	}

	return { valid: true };
}
