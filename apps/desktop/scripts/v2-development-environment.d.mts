export function resolveV2DevelopmentEnvironment(
	environment?: NodeJS.ProcessEnv,
	homeDirectory?: string,
): {
	AGENT567_WINDOWS_DATA_ROOT: string;
	AGENT567_WINDOWS_UPDATE_STORE: string;
	AGENT567_UPDATER_CACHE_DIR: string;
	AGENT567_HOME: string;
	AGENT567_CONFIG_DIR: string;
	AGENT567_CODING_AGENT_DIR: string;
	AGENT567_DESKTOP_USER_DATA_DIR: string;
	AGENT567_ACTION_RPC_ENDPOINT_FILE: string;
};
