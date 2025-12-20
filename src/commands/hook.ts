import { spinner } from "@clack/prompts";
import { Command } from "commander";
import fse from "fs-extra";
import pc from "picocolors";

import { loadConfig } from "../core/config";
import { HOOKS_DIR } from "../utils/paths";
import { openWithIDE } from "../utils/shell";
import { brand, printError, printInfo } from "../utils/ui";

// 示例 Hook 脚本（JavaScript）
const EXAMPLE_HOOK = `// 自定义 Hook 脚本示例
// 参数说明:
//   process.argv[2] - 项目路径
//   process.argv[3] - 项目名称
//   process.argv[4] - 模板名称

const projectPath = process.argv[2];
const projectName = process.argv[3];
const templateName = process.argv[4];

console.log('执行自定义 Hook: ' + projectName);
console.log('项目路径: ' + projectPath);
console.log('使用模板: ' + templateName);

// 在这里编写你的自定义逻辑...
// 例如: 创建额外的文件、修改配置等
`;

export const hookCommand = new Command("hook")
	.alias("hooks")
	.description("管理自定义 Hooks")
	.action(async () => {
		const config = loadConfig();

		console.log();
		console.log(brand.primary("  📝 自定义 Hooks"));
		console.log();

		// 如果 hooks 目录不存在或为空，创建示例文件
		if (!fse.existsSync(HOOKS_DIR)) {
			const examplePath = `${HOOKS_DIR}/example.js`;
			fse.writeFileSync(examplePath, EXAMPLE_HOOK, "utf-8");
			printInfo("已创建示例 Hook 脚本: example.js");
			console.log();
		}

		const s = spinner();
		s.start(`正在用 ${config.ide} 打开 Hooks 目录...`);

		try {
			await openWithIDE(config.ide, HOOKS_DIR);
			s.stop(`${brand.success("✓")} Hooks 目录已打开`);
			console.log();
		} catch (error) {
			s.stop("打开失败");
			console.log();
			printError((error as Error).message);
			console.log();
			console.log(pc.dim("  Hooks 目录: ") + pc.underline(HOOKS_DIR));
			console.log();
			process.exit(1);
		}

		console.log(pc.dim("  提示: 创建 .js 脚本文件，然后在 config.yaml 中配置"));
		console.log();
	});
