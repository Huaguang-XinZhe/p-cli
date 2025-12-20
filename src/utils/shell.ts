import { $ } from "bun";
import pc from "picocolors";
import { brand } from "./ui";

/**
 * 在指定目录执行命令（显示命令和输出）
 */
export async function execInDir(
	command: string,
	cwd: string,
	options: { silent?: boolean } = {},
): Promise<{ success: boolean; output: string }> {
	if (!options.silent) {
		console.log(pc.dim("  $ ") + brand.secondary(command));
	}

	try {
		// 使用 Bun.spawn 来获得更好的 TTY 支持和实时输出
		// 解析命令字符串（支持带引号的参数）
		const isWindows = process.platform === "win32";
		const shell = isWindows ? process.env.COMSPEC || "cmd.exe" : "/bin/sh";
		const shellArgs = isWindows ? ["/c"] : ["-c"];

		const proc = Bun.spawn([shell, ...shellArgs, command], {
			cwd,
			stdio: ["inherit", "inherit", "inherit"], // 继承父进程的 stdin/stdout/stderr，保持 TTY 特性
			env: {
				...process.env,
				FORCE_COLOR: "3", // 强制启用彩色输出（3 = 始终启用）
			},
		});

		const exitCode = await proc.exited;

		// 使用 inherit 时输出直接显示到终端，无法捕获
		// 但这样能保持彩色和动态更新效果
		return {
			success: exitCode === 0,
			output: "", // 输出已直接显示，无需捕获
		};
	} catch (error) {
		const err = error as Error;
		return { success: false, output: err.message };
	}
}

/**
 * 用 IDE 打开路径
 */
export async function openWithIDE(ide: string, path: string): Promise<void> {
	const ideCommands: Record<string, string> = {
		cursor: "cursor",
		code: "code",
		windsurf: "windsurf",
		trae: "trae",
	};

	const cmd = ideCommands[ide.toLowerCase()] || ide;

	try {
		await $`${cmd} ${path}`.quiet();
	} catch {
		// 抛出更详细的错误信息
		throw new Error(
			`无法打开 ${ide}，可能是 ${cmd} 命令不可用。请确保 ${ide} 已安装并添加到 PATH 环境变量。`,
		);
	}
}

/**
 * 检查命令是否存在
 */
export async function commandExists(command: string): Promise<boolean> {
	try {
		await $`where ${command}`.quiet();
		return true;
	} catch {
		return false;
	}
}
