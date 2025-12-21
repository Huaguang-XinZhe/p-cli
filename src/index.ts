#!/usr/bin/env bun
import { Command } from "commander";
import { configCommand } from "./commands/config";
import { deleteCommand } from "./commands/delete";
import { hookCommand } from "./commands/hook";
import { lsCommand } from "./commands/ls";
import { metaCommand } from "./commands/meta";
import { newCommand } from "./commands/new";
import { openCommand } from "./commands/open";
import { projectCommand } from "./commands/project";
import { templateCommand } from "./commands/template";
import { ensureInitialized } from "./core/config";
import { brand } from "./utils/ui";

const program = new Command();

// 确保首次运行时初始化
await ensureInitialized();

program
	.name("p")
	.description(brand.primary("⚡ P-CLI - 项目管理工具"))
	.version("1.0.0");

// 注册子命令
program.addCommand(newCommand);
program.addCommand(lsCommand);
program.addCommand(openCommand);
program.addCommand(deleteCommand);
program.addCommand(projectCommand);
program.addCommand(templateCommand);
program.addCommand(configCommand);
program.addCommand(hookCommand);
program.addCommand(metaCommand);

program.parse();
