import { spinner } from "@clack/prompts";
import { Command } from "commander";
import fse from "fs-extra";

import { loadConfig } from "../core/config";
import { METADATA_PATH } from "../utils/paths";
import { openWithIDE } from "../utils/shell";
import { brand, printError, printInfo, printPath } from "../utils/ui";

export const metaCommand = new Command("meta")
	.description("查看项目元数据")
	.action(async () => {
		const config = loadConfig();

		console.log();
		console.log(brand.primary("  📋 项目元数据"));
		printPath("  路径", METADATA_PATH);
		console.log();

		// 如果文件不存在，创建空的元数据文件
		if (!fse.existsSync(METADATA_PATH)) {
			fse.writeFileSync(
				METADATA_PATH,
				JSON.stringify({ projects: {} }, null, 2),
				"utf-8",
			);
			printInfo("已创建空的元数据文件");
			console.log();
		}

		const s = spinner();
		s.start(`正在用 ${config.ide} 打开元数据文件...`);

		try {
			await openWithIDE(config.ide, METADATA_PATH);
			s.stop(`${brand.success("✓")} 元数据文件已打开`);
			console.log();
		} catch (error) {
			s.stop("打开失败");
			console.log();
			printError((error as Error).message);
			console.log();
			printPath("  元数据文件位置", METADATA_PATH);
			console.log();
			process.exit(1);
		}
	});
