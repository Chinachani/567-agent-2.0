import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

function canonicalPath(path) {
	const suffix = [];
	let current = resolve(path);
	while (!existsSync(current)) {
		const parent = dirname(current);
		if (parent === current) throw new Error("Cannot resolve the development data directory");
		suffix.unshift(basename(current));
		current = parent;
	}
	return join(realpathSync(current), ...suffix);
}

function inside(root, path) {
	const child = relative(root, path);
	return child === "" || (!isAbsolute(child) && child !== ".." && !child.startsWith(`..${sep}`));
}

function expandPath(value, homeDirectory) {
	if (value === "~") return homeDirectory;
	if (value.startsWith("~/") || value.startsWith("~\\")) return resolve(homeDirectory, value.slice(2));
	if (!isAbsolute(value)) throw new Error("2.0 development data paths must be absolute");
	return resolve(value);
}

/** All writable development state must stay below a physically separate v2 root. */
export function resolveV2DevelopmentEnvironment(environment = process.env, homeDirectory = homedir()) {
	const root = resolve(homeDirectory, ".567agent-v2-dev");
	const canonicalRoot = canonicalPath(root);
	if (canonicalRoot !== join(canonicalPath(homeDirectory), ".567agent-v2-dev")) {
		throw new Error("2.0 development root must not redirect to another data directory");
	}
	for (const legacyName of [".vetta", ".567agent", ".567agent-dev", ".567agent-ui-verify"]) {
		const legacyRoot = canonicalPath(join(homeDirectory, legacyName));
		if (inside(legacyRoot, canonicalRoot) || inside(canonicalRoot, legacyRoot)) {
			throw new Error("2.0 development root overlaps a 1.x data directory");
		}
	}
	const configDir = environment.AGENT567_CONFIG_DIR?.trim() || ".567agent-v2-dev";
	if (!/^\.567agent-v2-[A-Za-z0-9][A-Za-z0-9._-]*$/.test(configDir)) {
		throw new Error("2.0 development requires an isolated .567agent-v2-* project configuration directory");
	}
	const home = expandPath(environment.AGENT567_HOME?.trim() || root, homeDirectory);
	const userData = expandPath(
		environment.AGENT567_DESKTOP_USER_DATA_DIR?.trim() || join(home, "electron-user-data"),
		homeDirectory,
	);
	for (const path of [home, userData]) {
		if (!inside(canonicalRoot, canonicalPath(path))) {
			throw new Error("2.0 development data must stay inside ~/.567agent-v2-dev");
		}
	}
	const endpoint = environment.AGENT567_ACTION_RPC_ENDPOINT_FILE?.trim();
	if (endpoint && !inside(canonicalRoot, canonicalPath(expandPath(endpoint, homeDirectory)))) {
		throw new Error("2.0 development cannot reuse a 1.x Action RPC endpoint file");
	}
	const agentDir = expandPath(environment.AGENT567_CODING_AGENT_DIR?.trim() || join(home, "agent"), homeDirectory);
	if (!inside(canonicalRoot, canonicalPath(agentDir))) {
		throw new Error("2.0 development cannot reuse a 1.x agent configuration directory");
	}
	const windowsPaths = {};
	for (const [key, folder] of Object.entries({
		AGENT567_WINDOWS_DATA_ROOT: "windows-data",
		AGENT567_WINDOWS_UPDATE_STORE: "windows-updates",
		AGENT567_UPDATER_CACHE_DIR: "updater-cache",
	})) {
		const path = expandPath(environment[key]?.trim() || join(home, folder), homeDirectory);
		if (!inside(canonicalRoot, canonicalPath(path))) throw new Error(`${key} must use the 2.0 development root`);
		windowsPaths[key] = path;
	}
	return {
		...windowsPaths,
		AGENT567_HOME: home,
		AGENT567_CONFIG_DIR: configDir,
		AGENT567_CODING_AGENT_DIR: agentDir,
		AGENT567_DESKTOP_USER_DATA_DIR: userData,
		AGENT567_ACTION_RPC_ENDPOINT_FILE: endpoint ? expandPath(endpoint, homeDirectory) : join(home, "action-server.json"),
	};
}
