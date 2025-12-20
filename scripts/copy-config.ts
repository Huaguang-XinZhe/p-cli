import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// 确保 dist 目录存在
const distDir = join(process.cwd(), "dist");
if (!existsSync(distDir)) {
	mkdirSync(distDir, { recursive: true });
}

// 复制 config.yaml 到 dist 目录
const srcConfig = join(process.cwd(), "config.yaml");
const destConfig = join(distDir, "config.yaml");

if (existsSync(srcConfig)) {
	copyFileSync(srcConfig, destConfig);
	console.log("✓ 已复制 config.yaml 到 dist 目录");
} else {
	console.error("✗ 找不到 config.yaml");
	process.exit(1);
}
