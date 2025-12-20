import pc from "picocolors";

/**
 * 品牌颜色 - 橙色主题
 * 使用 ANSI 256 色码来实现橙色
 */
export const brand = {
	// 橙色 (ANSI 256: 208)
	primary: (text: string) => `\x1b[38;5;208m${text}\x1b[0m`,
	// 浅橙色 (ANSI 256: 214)
	secondary: (text: string) => `\x1b[38;5;214m${text}\x1b[0m`,
	success: pc.green,
	warning: pc.yellow,
	error: pc.red,
	dim: pc.dim,
	bold: pc.bold,
};

/**
 * 橙色背景
 */
export const bgOrange = (text: string) =>
	`\x1b[48;5;208m\x1b[97m${text}\x1b[0m`;

/**
 * 打印欢迎横幅
 */
export function printBanner(): void {
	console.log();
	console.log(brand.primary("  ┌─────────────────────────────┐"));
	console.log(
		brand.primary("  │") +
			brand.bold("    ⚡ P-CLI 项目管理器     ") +
			brand.primary("│"),
	);
	console.log(brand.primary("  └─────────────────────────────┘"));
	console.log();
}

/**
 * 打印成功消息
 */
export function printSuccess(message: string): void {
	console.log(`${brand.success("✓")} ${message}`);
}

/**
 * 打印错误消息
 */
export function printError(message: string): void {
	console.log(`${brand.error("✗")} ${message}`);
}

/**
 * 打印警告消息
 */
export function printWarning(message: string): void {
	console.log(`${brand.warning("⚠")} ${message}`);
}

/**
 * 打印信息消息
 */
export function printInfo(message: string): void {
	console.log(`${brand.secondary("◆")} ${message}`);
}

/**
 * 打印路径
 */
export function printPath(label: string, path: string): void {
	console.log(pc.dim(`  ${label}: `) + pc.underline(path));
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days} 天前`;
	if (hours > 0) return `${hours} 小时前`;
	if (minutes > 0) return `${minutes} 分钟前`;
	return "刚刚";
}
