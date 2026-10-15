import { ipcMain } from "electron";
import { isCloudBuildEnabled } from "../shared/feature-flags.js";

/** Register local handlers before loading any renderer; never wait on a server here. */
export async function startCloudServices(): Promise<() => void> {
	if (isCloudBuildEnabled()) {
		const { startCloudMain } = await import("./cloud/index.js");
		return startCloudMain();
	}
	const handlers = {
		"vetta:models:fetch-remote": () => ({ providers: {} }),
		"vetta:subscription:status": () => ({ status: null }),
		"vetta:auth:refresh-token": () => ({ status: "unauthorized" }),
		"vetta:settings:get-server-token": () => undefined,
		"vetta:settings:set-server-token": () => {},
		"vetta:settings:get-server-refresh-token": () => undefined,
		"vetta:settings:set-server-refresh-token": () => {},
	};
	for (const [channel, handler] of Object.entries(handlers)) ipcMain.handle(channel, handler);
	return () => {
		for (const channel of Object.keys(handlers)) ipcMain.removeHandler(channel);
	};
}
