import { mkdirSync } from "node:fs";
import { app } from "electron";
import { resolveV2DevelopmentEnvironment } from "../../scripts/v2-development-environment.mjs";

// Run before importing modules that derive paths or migrate legacy state.
// This repository currently builds development previews, including packaged ones.
const environment = resolveV2DevelopmentEnvironment();
Object.assign(process.env, environment);
mkdirSync(environment.AGENT567_DESKTOP_USER_DATA_DIR, { recursive: true, mode: 0o700 });
app.commandLine.removeSwitch("user-data-dir");
app.commandLine.appendSwitch("user-data-dir", environment.AGENT567_DESKTOP_USER_DATA_DIR);
app.setPath("userData", environment.AGENT567_DESKTOP_USER_DATA_DIR);
app.setPath("sessionData", environment.AGENT567_DESKTOP_USER_DATA_DIR);
