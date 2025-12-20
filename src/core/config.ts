import { dirname, join } from "node:path";
import fse from "fs-extra";
import { parse } from "yaml";
import type { Config } from "../types";
import {
	CONFIG_PATH,
	HOOKS_DIR,
	P_CLI_ROOT,
	PROJECTS_DIR,
	TEMPLATES_DIR,
} from "../utils/paths";

/**
 * 确保 p-cli 目录结构已初始化
 */
export async function ensureInitialized(): Promise<void> {
	// 创建目录结构
	const dirs = [P_CLI_ROOT, PROJECTS_DIR, TEMPLATES_DIR, HOOKS_DIR];
	for (const dir of dirs) {
		await fse.ensureDir(dir);
	}

	// 获取当前执行文件的目录
	const execPath = process.argv[1];
	if (!execPath) {
		throw new Error("无法获取当前执行文件路径，process.argv[1] 为 undefined");
	}
	const currentDir = dirname(execPath);
	const defaultConfigPath = join(currentDir, "config.yaml");

	if (await fse.pathExists(defaultConfigPath)) {
		// 如果配置文件不存在，直接复制
		if (!(await fse.pathExists(CONFIG_PATH))) {
			await fse.copyFile(defaultConfigPath, CONFIG_PATH);
		} else {
			// 如果配置文件存在，比较修改时间，如果源文件更新则覆盖
			const sourceStats = await fse.stat(defaultConfigPath);
			const targetStats = await fse.stat(CONFIG_PATH);

			if (sourceStats.mtime > targetStats.mtime) {
				await fse.copyFile(defaultConfigPath, CONFIG_PATH);
			}
		}
	}
}

/**
 * 读取配置文件
 */
export function loadConfig(): Config {
	if (!fse.existsSync(CONFIG_PATH)) {
		throw new Error("配置文件不存在，请运行 p config 创建配置文件");
	}

	try {
		const content = fse.readFileSync(CONFIG_PATH, "utf-8");
		return parse(content) as Config;
	} catch (error) {
		throw new Error(`配置文件解析失败: ${(error as Error).message}`);
	}
}
