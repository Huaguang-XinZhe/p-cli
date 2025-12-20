import { spinner } from "@clack/prompts";
import { Command } from "commander";

import { loadConfig } from "../core/config";
import { CONFIG_PATH } from "../utils/paths";
import { openWithIDE } from "../utils/shell";
import { brand, printError, printPath } from "../utils/ui";

export const configCommand = new Command("config")
	.description("编辑配置文件")
	.action(async () => {
		const config = loadConfig();

		console.log();
		console.log(brand.primary("  ⚙️  配置文件"));
		printPath("  路径", CONFIG_PATH);
		console.log();

		const s = spinner();
		s.start(`正在用 ${config.ide} 打开配置文件...`);

		try {
			await openWithIDE(config.ide, CONFIG_PATH);
			s.stop(`${brand.success("✓")} 配置文件已打开`);
			console.log();
		} catch (error) {
			s.stop("打开失败");
			console.log();
			printError((error as Error).message);
			console.log();
			printPath("  配置文件位置", CONFIG_PATH);
			console.log();
			process.exit(1);
		}
	});
