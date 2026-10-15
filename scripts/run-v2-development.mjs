import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { resolveV2DevelopmentEnvironment } from "../apps/desktop/scripts/v2-development-environment.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const mode = process.argv[2] ?? "desktop";
const profiles = { desktop: "dev:workspace", source: "start:workspace" };
const dataEnvironment = resolveV2DevelopmentEnvironment();
const environment = {
	...process.env,
	...dataEnvironment,
	AGENT567_CLOUD_ENABLED: "false",
	AGENT567_BUILD_ENV: "development",
	AGENT567_DESKTOP_DEV_PORT: process.env.AGENT567_DESKTOP_DEV_PORT ?? "3022",
};

if (mode === "--print-config") {
	console.log(JSON.stringify({
		...dataEnvironment,
		cloudEnabled: false,
		rendererPort: environment.AGENT567_DESKTOP_DEV_PORT,
	}, null, 2));
} else {
	const task = profiles[mode];
	if (!task) throw new Error(`Unknown 2.0 development mode: ${mode}`);
	const child = spawn("bun", ["run", "--cwd", "apps/desktop", task, ...process.argv.slice(3)], {
		cwd: repoRoot,
		env: environment,
		stdio: "inherit",
	});
	for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
	child.once("error", (error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
	child.once("exit", (code) => {
		process.exitCode = code ?? 1;
	});
}
