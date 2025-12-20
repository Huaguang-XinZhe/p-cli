import { homedir } from "node:os";
import { join } from "node:path";

/**
 * p-cli 根目录
 */
export const P_CLI_ROOT = join(homedir(), ".p-cli");

/**
 * 配置文件路径
 */
export const CONFIG_PATH = join(P_CLI_ROOT, "config.yaml");

/**
 * 元数据文件路径（记录项目元数据）
 */
export const METADATA_PATH = join(P_CLI_ROOT, "meta.json");

/**
 * 项目目录
 */
export const PROJECTS_DIR = join(P_CLI_ROOT, "projects");

/**
 * 模板目录
 */
export const TEMPLATES_DIR = join(P_CLI_ROOT, "templates");

/**
 * Hooks 目录（自定义脚本）
 */
export const HOOKS_DIR = join(P_CLI_ROOT, "hooks");

/**
 * @deprecated 使用 HOOKS_DIR
 */
export const SCRIPTS_DIR = HOOKS_DIR;
