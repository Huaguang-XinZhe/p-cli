import { isAbsolute, join, resolve } from "node:path";
import {
	confirm,
	intro,
	isCancel,
	outro,
	select,
	spinner,
	text,
} from "@clack/prompts";
import { Command } from "commander";
import fse from "fs-extra";
import pc from "picocolors";

import { loadConfig } from "../core/config";
import { getProjectPath, listProjects, projectExists } from "../core/project";
import { getAllTemplates, getTemplateChoices } from "../core/template";
import type { TemplateConfig } from "../types";
import { TEMPLATES_DIR } from "../utils/paths";
import { bgOrange, brand, printError, printInfo } from "../utils/ui";

type SourceType = "template" | "project";

interface AddContext {
	type: SourceType;
	name: string;
	alias: string;
	targetPath: string;
}

function validateBasePath(input?: string): string {
	if (!input || input.trim() === "") return ".";
	if (isAbsolute(input.trim())) {
		throw new Error("目标路径必须为相对路径或 .");
	}
	return input.trim();
}

function validateAlias(input: string): string | undefined {
	if (!input || input.trim() === "") {
		return "别名不能为空";
	}
	const invalidChars = /[<>:"/\\|?*]/;
	if (invalidChars.test(input)) {
		return "别名包含非法字符";
	}
	return undefined;
}

async function ensureBasePath(basePath: string): Promise<void> {
	if (!(await fse.pathExists(basePath))) {
		await fse.ensureDir(basePath);
	}
}

async function ensureDestination(destPath: string): Promise<void> {
	if (!(await fse.pathExists(destPath))) return;

	const entries = await fse.readdir(destPath);
	if (entries.length === 0) return;

	const shouldContinue = await confirm({
		message: `${brand.warning("⚠")} 目标目录已存在且非空，继续将覆盖文件，是否继续？`,
		initialValue: false,
	});

	if (isCancel(shouldContinue) || !shouldContinue) {
		outro(pc.dim("已取消"));
		process.exit(0);
	}
}

function splitSourceArg(input: string): { name: string; alias: string } {
	const [name, alias] = input.split(":");
	if (!name) {
		throw new Error("缺少模板或项目名！");
	}
	return { name, alias: alias || name };
}

async function resolveSource(
	sourceArg: string | undefined,
	configuredTemplates: Record<string, TemplateConfig>,
): Promise<{ type: SourceType; name: string; alias: string }> {
	if (!sourceArg) {
		throw new Error("sourceArg 未提供");
	}

	const { name, alias } = splitSourceArg(sourceArg);

	const isTemplate = Boolean(configuredTemplates[name]);
	const isProject = projectExists(name);

	if (!isTemplate && !isProject) {
		printError(`未找到模板或项目: ${name}`);
		console.log(
			pc.dim("可用模板: ") +
				Object.keys(configuredTemplates).join(", ") +
				pc.dim("；项目请使用 p ls 查看"),
		);
		process.exit(1);
	}

	if (isTemplate && isProject) {
		const selected = await select({
			message: "检测到同名模板和项目，请选择来源类型:",
			options: [
				{ value: "template", label: "模板" },
				{ value: "project", label: "项目" },
			],
		});

		if (isCancel(selected)) {
			outro(pc.dim("已取消"));
			process.exit(0);
		}

		return { type: selected as SourceType, name, alias };
	}

	return { type: isTemplate ? "template" : "project", name, alias };
}

async function interactivePick(
	templates: Record<string, TemplateConfig>,
	projects: ReturnType<typeof listProjects>,
): Promise<{ type: SourceType; name: string; alias: string; target: string }> {
	if (Object.keys(templates).length === 0 && projects.length === 0) {
		printInfo("暂无模板或项目可用");
		process.exit(0);
	}

	intro(bgOrange(" 添加到当前项目 "));

	const type = (await select({
		message: "选择来源类型:",
		options: [
			{ value: "template", label: "模板", hint: "来自 config 或本地模板" },
			{ value: "project", label: "项目", hint: "来自 ~/.p-cli/projects" },
		],
	})) as SourceType;

	if (isCancel(type)) {
		outro(pc.dim("已取消"));
		process.exit(0);
	}

	let name: string;

	if (type === "template") {
		if (Object.keys(templates).length === 0) {
			printInfo("暂无可用模板");
			process.exit(0);
		}

		const result = await select({
			message: "请选择模板:",
			options: getTemplateChoices(templates),
		});

		if (isCancel(result)) {
			outro(pc.dim("已取消"));
			process.exit(0);
		}

		name = result as string;
	} else {
		if (projects.length === 0) {
			printInfo("暂无可用项目");
			process.exit(0);
		}

		const result = await select({
			message: "请选择项目:",
			options: projects.map((p) => ({
				value: p.name,
				label: p.name,
				hint: p.template ? pc.cyan(p.template) : pc.dim(p.path),
			})),
		});

		if (isCancel(result)) {
			outro(pc.dim("已取消"));
			process.exit(0);
		}

		name = result as string;
	}

	const aliasInput = await text({
		message: "请输入添加后的目录名（默认同名）:",
		initialValue: name,
		validate: (val) => validateAlias(val as string),
	});

	if (isCancel(aliasInput)) {
		outro(pc.dim("已取消"));
		process.exit(0);
	}

	const targetInput = await text({
		message: "请输入目标基路径（默认为当前目录 .）:",
		placeholder: ". 或相对路径",
		initialValue: ".",
		validate: (val) => {
			try {
				validateBasePath(val);
			} catch (error) {
				return (error as Error).message;
			}
		},
	});

	if (isCancel(targetInput)) {
		outro(pc.dim("已取消"));
		process.exit(0);
	}

	return {
		type,
		name,
		alias: String(aliasInput),
		target: validateBasePath(targetInput as string),
	};
}

function getTemplateDir(templateKey: string, template: TemplateConfig): string {
	const dirName = template.dir || templateKey;
	return join(TEMPLATES_DIR, dirName);
}

async function handleProjectAdd(
	projectName: string,
	destDir: string,
	projects: ReturnType<typeof listProjects>,
): Promise<void> {
	const exists = projectExists(projectName);
	if (!exists) {
		printError(`项目不存在: ${projectName}`);
		console.log(pc.dim("使用 p ls 查看所有项目"));
		process.exit(1);
	}

	const sourcePath = getProjectPath(projectName);

	const project = projects.find((p) => p.name === projectName);

	console.log();
	console.log(pc.dim("  来源项目: ") + brand.secondary(projectName));
	if (project?.template) {
		console.log(pc.dim("  模板标记: ") + pc.cyan(project.template));
	}
	console.log(pc.dim("  目标路径: ") + pc.dim(destDir));

	const copySpinner = spinner();
	copySpinner.start("正在复制目录...");

	try {
		await fse.copy(sourcePath, destDir, { overwrite: true });
		copySpinner.stop(
			`${brand.success("✓")} 目录已复制到: ${brand.primary(destDir)}`,
		);
		outro(brand.success("✨ 添加完成"));
	} catch (error) {
		copySpinner.stop("复制失败");
		printError((error as Error).message);
		process.exit(1);
	}
}

export const addCommand = new Command("add")
	.description("将模板或项目添加到当前目录或指定路径")
	.argument("[source]", "模板名或项目名，支持 name:alias 重命名")
	.argument("[target]", "目标基路径，默认为当前目录 .")
	.action(async (sourceArg?: string, targetArg?: string) => {
		const projects = listProjects();
		const config = loadConfig();
		const allTemplates = await getAllTemplates(config.templates);

		let context: AddContext;

		if (!sourceArg) {
			const picked = await interactivePick(allTemplates, projects);
			context = {
				type: picked.type,
				name: picked.name,
				alias: picked.alias,
				targetPath: resolve(process.cwd(), picked.target),
			};
		} else {
			const resolvedTarget = (() => {
				try {
					return validateBasePath(targetArg);
				} catch (error) {
					printError((error as Error).message);
					process.exit(1);
				}
			})();

			const { type, name, alias } = await resolveSource(
				sourceArg,
				allTemplates,
			);
			context = {
				type,
				name,
				alias,
				targetPath: resolve(process.cwd(), resolvedTarget),
			};
		}

		const basePath = context.targetPath;
		const destDir = resolve(basePath, context.alias);

		await ensureBasePath(basePath);
		await ensureDestination(destDir);

		if (context.type === "template") {
			const template = allTemplates[context.name];
			if (!template) {
				printError(`模板不存在: ${context.name}`);
				process.exit(1);
			}

			const templateDir = getTemplateDir(context.name, template);
			if (!(await fse.pathExists(templateDir))) {
				printError(`模板目录不存在: ${templateDir}`);
				process.exit(1);
			}

			console.log();
			console.log(pc.dim("  使用模板目录: ") + brand.secondary(templateDir));
			console.log(pc.dim("  目标路径: ") + pc.dim(destDir));

			const s = spinner();
			s.start("正在复制目录...");
			try {
				await fse.copy(templateDir, destDir, { overwrite: true });
				s.stop(`${brand.success("✓")} 模板已复制到: ${brand.primary(destDir)}`);
				outro(brand.success("✨ 添加完成"));
			} catch (error) {
				s.stop("复制失败");
				printError((error as Error).message);
				process.exit(1);
			}
			return;
		}

		await handleProjectAdd(context.name, destDir, projects);
	});
