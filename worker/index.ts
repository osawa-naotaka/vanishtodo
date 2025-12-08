/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from "hono";

type Bindings = {
    DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>()

app.get('/api/v1/', async (c) => {
	const ps = c.env.DB.prepare("SELECT * from users");
	const data = await ps.first();
	return c.json(data)
})

export default app;


// export default {
// 	async fetch(request, env, ctx): Promise<Response> {
// 		const ps = env.DB.prepare("SELECT * from users");
// 		const data = await ps.first();

// 		// return new Response('Hello World!');
// 		return Response.json(data);
// 	},
// } satisfies ExportedHandler<Env>;
