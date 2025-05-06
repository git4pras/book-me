import { Hono } from "hono";
import { DurableMCP } from "workers-mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import OAuthProvider, { type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { z } from "zod";

import type { UserProps } from "./types";
import { authorize, callback, confirmConsent, tokenExchangeCallback } from "./auth";

export class AuthenticatedMCP extends DurableMCP<UserProps, Env> {
	server = new McpServer({
		name: "Book Me",
		version: "1.0.0",
	});

	async init() {
		// Useful for debugging. This will show the current user's claims and the Auth0 tokens.
		this.server.tool("whoami", "Get the current user's details", {}, async () => ({
			content: [{ type: "text", text: JSON.stringify(this.props.claims, null, 2) }],
		}));
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
			  content: [{ type: "text", text: String(a + b) }],
			}),
		  );
	}
}

// Initialize the Hono app with the routes for the OAuth Provider.
const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();
app.get("/authorize", authorize);
app.post("/authorize/consent", confirmConsent);
app.get("/callback", callback);

export default new OAuthProvider({
	apiRoute: "/sse",
	// TODO: fix these types
	// @ts-ignore
	apiHandler: AuthenticatedMCP.mount("/sse"),
	// TODO: fix these types
	// @ts-ignore
	defaultHandler: app,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
	tokenExchangeCallback,
});
