/**
 * 模板配置
 */
export interface TemplateConfig {
	name: string;
	command?: string; // 命令模式
	dir?: string; // 本地模板文件夹名（在 ~/.p-cli/templates/ 下）
	hooks?: string[]; // 该模板需要执行的 hooks 列表
}

/**
 * Hook 定义（根节点声明）
 */
export interface HookDefinition {
	name: string;
	command?: string; // 命令模式
	file?: string; // 脚本文件名（在 ~/.p-cli/hooks/ 下）
}

/**
 * 主配置文件
 */
export interface Config {
	ide: string;
	hooks: Record<string, HookDefinition>;
	templates: Record<string, TemplateConfig>;
}

/**
 * 项目元数据（存储在 metadata.json 中的单个项目）
 */
export interface ProjectMetaData {
	template?: string;
	createdAt: string;
}

/**
 * 全局元数据文件结构
 */
export interface Metadata {
	projects: Record<string, ProjectMetaData>; // key 为项目名
}

/**
 * 项目信息
 */
export interface ProjectInfo {
	name: string;
	path: string;
	template?: string;
	createdAt: Date;
	modifiedAt: Date;
}
