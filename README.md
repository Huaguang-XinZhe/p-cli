# P-CLI ⚡

一个彩色交互式的项目管理 CLI 工具，快速创建和管理项目。

## 安装

```bash
# 从源码构建
bun install
bun run build
bun link

# 或下载预编译版本
# 见 GitHub Releases
```

## 使用

### 创建新项目

```bash
# 快速创建空项目（使用 empty 模板，执行 gitInit hook）
p new my-project

# 选择模板创建
p new my-project -t

# 指定模板创建
p new my-project -t react

# 交互式创建（输入名称和选择模板）
p new
```

### 管理项目

```bash
# 列出所有项目（显示模板类型）
p ls

# 打开项目目录
p project

# 打开项目（交互选择）
p open

# 打开指定项目
p open my-project

# 删除项目（交互选择）
p delete

# 删除指定项目
p delete my-project

# 删除所有项目（带进度显示）
p delete all
```

### 管理模板

```bash
# 打开本地模板目录
p template

# 添加项目为本地模板（交互选择）
p template add

# 添加指定项目为本地模板
p template add my-project
```

### 配置和元数据

```bash
# 编辑配置文件
p config

# 管理自定义 Hooks（JavaScript 脚本）
p hook

# 查看项目元数据
p meta
```

## 目录结构

```
~/.p-cli/
├── config.yaml     # 配置文件
├── metadata.json   # 项目元数据（模板、执行过的 hooks 等）
├── projects/       # 项目目录
├── templates/      # 本地模板目录
└── hooks/          # 自定义 Hooks 脚本目录（.js 文件）
```

## 配置文件

`~/.p-cli/config.yaml`:

```yaml
# 默认 IDE
ide: cursor  # 可选: cursor, code, windsurf, trae

# Hooks 定义（在根节点声明，供模板引用）
hooks:
  gitInit:
    name: Git 初始化
    command: git init
  
  installDeps:
    name: 安装依赖
    command: bun install
  
  taze:
    name: Taze 递归 major 版本更新
    command: bunx taze major -r -w
  
  biome:
    name: Biome 初始化
    command: bun add -D --save-exact @biomejs/biome && bunx @biomejs/biome init
  
  # 自定义脚本示例（file 必须是 .js 文件，在 ~/.p-cli/hooks/ 下）
  myScript:
    name: 自定义脚本
    file: my-script.js

# 模板配置（每个模板可挂 hooks 列表）
templates:
  # 空项目模板（p new <name> 的默认配置）
  empty:
    name: 空项目
    hooks:
      - gitInit

  react:
    name: React (Vite)
    command: bun create vite . --template react-ts --rolldown --no-install
    hooks:
      - gitInit
      - installDeps
  
  next:
    name: Next.js
    command: bunx create-next-app@latest . --ts --tailwind --app --src-dir --no-import-alias --yes
    hooks:
      - gitInit
  
  # 本地模板（dir 为模板文件夹名，在 ~/.p-cli/templates/ 下）
  custom:
    name: 自定义模板
    dir: my-template
    hooks:
      - gitInit
      - installDeps
      - myScript
```

## 内置模板

| 模板 | 描述 |
|------|------|
| `empty` | 空项目（仅 git init） |
| `react` | React + Vite + TypeScript |
| `next` | Next.js + TypeScript + Tailwind |
| `vue` | Vue + Vite + TypeScript |
| `remix` | Remix (React Router) |

## 内置 Hooks

| Hook | 描述 |
|------|------|
| `gitInit` | Git 仓库初始化 |
| `installDeps` | 安装依赖 (bun install) |
| `taze` | 递归更新依赖到最新 major 版本 |
| `biome` | 初始化 Biome 代码格式化工具 |

## 自定义 Hooks

1. 在 `~/.p-cli/hooks/` 中创建 JavaScript 脚本文件：

```javascript
// my-script.js
const projectPath = process.argv[2];
const projectName = process.argv[3];
const templateName = process.argv[4];

console.log(`项目: ${projectName}`);
console.log(`路径: ${projectPath}`);
console.log(`模板: ${templateName}`);

// 你的自定义逻辑...
```

2. 在 `config.yaml` 的 `hooks` 中声明（使用 `file` 字段指定文件名）：

```yaml
hooks:
  myScript:
    name: 自定义脚本
    file: my-script.js  # 必须是 .js 文件
```

3. 在模板的 `hooks` 列表中引用：

```yaml
templates:
  myTemplate:
    name: 我的模板
    command: ...
    hooks:
      - gitInit
      - installDeps
      - myScript  # 引用自定义 hook
```

## 本地模板

### 方式一：使用 `p template add` 命令

```bash
# 交互式选择项目添加为模板
p template add

# 或直接指定项目名
p template add my-project
```

工具会自动：
1. 检查项目是否是 git 仓库，如果是则使用 `git ls-files` 获取未被忽略的文件
2. 如果不是 git 仓库但有 `.gitignore`，则临时初始化 git 后获取文件列表
3. 如果没有 `.gitignore`，则使用默认忽略规则（node_modules、dist、build 等）
4. 复制文件到 `~/.p-cli/templates/` 目录

### 方式二：手动创建

在 `~/.p-cli/templates/` 中创建模板文件夹：

```bash
# 打开模板目录
p template
```

然后在配置中使用 `dir` 字段引用：

```yaml
templates:
  myTemplate:
    name: 我的自定义模板
    dir: my-template  # 文件夹名，不需要完整路径
    hooks:
      - gitInit
```

**注意：** 本地模板会自动注册，即使不在 `config.yaml` 中声明也可以使用。如果需要挂载 hooks，再在配置中声明即可。

## 更新配置

修改项目根目录的 `config.yaml` 后，运行：

```bash
bun run build && bun link
```

然后运行任意 `p` 命令，配置文件会自动同步到 `~/.p-cli/config.yaml`（基于文件修改时间）。

## License

MIT
