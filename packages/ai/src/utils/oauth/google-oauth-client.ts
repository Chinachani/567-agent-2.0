/** OAuth applications belong to the distributor; never bundle third-party credentials. */
export function getGoogleOAuthClient(provider: "GEMINI_CLI" | "ANTIGRAVITY"): {
	clientId: string;
	clientSecret: string;
} {
	const prefix = `GOOGLE_${provider}`;
	const environment = typeof process === "undefined" ? {} : process.env;
	const clientId = environment[`${prefix}_CLIENT_ID`]?.trim();
	const clientSecret = environment[`${prefix}_CLIENT_SECRET`]?.trim();
	if (!clientId || !clientSecret) {
		throw new Error(`Configure ${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET before using this OAuth provider`);
	}
	return { clientId, clientSecret };
}
