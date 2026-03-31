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

import { User, Property, Ledger } from "../../../src/objects"

function json(data: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			...(init.headers ?? {}),
		},
	});
}
function withCors(request: Request, response: Response): Response {
	const origin = request.headers.get('Origin');

	// Add any additional UI origins here (prod custom domain, Pages domain, etc.)
	const allowedOrigins = new Set<string>([
		'http://127.0.0.1:50542', // ng serve (from angular.json)
		'http://localhost:50542',
	]);

	if (!origin || !allowedOrigins.has(origin)) return response;

	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', origin);
	headers.set('Vary', 'Origin');
	headers.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	headers.set('Access-Control-Max-Age', '86400');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
function notFound(): Response {
	return json({ error: 'Not found' }, { status: 404 });
}
function badRequest(message: string): Response {
	return json({ error: message }, { status: 400 });
}
function methodNotAllowed(): Response {
	return json({ error: 'Method not allowed' }, { status: 405 });
}
function getPathParts(url: URL): string[] {
	return url.pathname.split('/').filter(Boolean);
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		const parts = getPathParts(url);

		let response: Response;

		// Expect /api/...
		if (parts[0] !== 'api') return notFound();

		// GET /api/users/:login
		if (parts[1] === 'users' && parts.length === 3) {
			if (request.method !== 'GET') return methodNotAllowed();

			const login = decodeURIComponent(parts[2]).trim();
			if (!login) return badRequest('login is required');

			// find user by login
			let user = await env.DB
				.prepare('SELECT * FROM users WHERE login = ?1 LIMIT 1')
				.bind(login)
				.first<User>();

			if (!user) return json({ error: 'User not found' }, { status: 404 });

			response = json(user);
		}

		// /api/properties/:userId
		if (parts[1] === 'properties') {

			// GET /api/properties/:userId
			if (request.method === 'GET' && parts.length === 3) {
				const userId = decodeURIComponent(parts[2]).trim();
				if (!userId) return badRequest('userId is required');

				const result = await env.DB
					.prepare('SELECT * FROM properties WHERE userId = ?1')
					.bind(userId)
					.all<Property>();

				response = json(result.results ?? []);
			}

			// POST /api/properties
			if (request.method === 'POST' && parts.length === 2) {
				const body = (await request.json().catch(() => null)) as Partial<Property>;
				if (!body) return badRequest('Invalid JSON body');

				const id = crypto.randomUUID();
				const userId = body.userId as string;
				const number = body.number as string;
				const address = body.address as string;

				if (!userId) return badRequest('userId is required');
				if (!number) return badRequest('number is required');
				if (!address) return badRequest('address is required');

				await env.DB
					.prepare('INSERT INTO properties (id, userId, number, address) VALUES (?1, ?2, ?3, ?4)')
					.bind(id, userId, number, address)
					.run();

				response = json({ id, userId, number, address }, { status: 201 });
			}

			response = methodNotAllowed();
		}

		if (parts[1] === 'ledger') {

			// GET /api/ledger/:propertyId
			if (request.method === 'GET' && parts.length === 3) {
				const propertyId = decodeURIComponent(parts[2]).trim();
				if (!propertyId) return badRequest('propertyId is required');

				const result = await env.DB
					.prepare('SELECT * FROM ledger WHERE propertyId = ?1')
					.bind(propertyId)
					.all<Ledger>();

				response =  json(result.results ?? []);
			}

			// DELETE /api/ledger/:id
			if (request.method === 'DELETE' && parts.length === 3) {
				const id = decodeURIComponent(parts[2]).trim();
				if (!id) return badRequest('property id is required');

				await env.DB
					.prepare('DELETE FROM ledger WHERE id = ?1')
					.bind(id)
					.run();

				response = new Response(null, { status: 204 });
			}

			// DELETE /api/ledger/
			// Optional query params: ?id=123&type=expense:mortgage&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
			if (request.method === 'DELETE' && parts.length === 2) {
				const propertyId = url.searchParams.get('propertyId')?.trim() ?? null;
				if (!propertyId) return badRequest('propertyId is required');

				const type = url.searchParams.get('type')?.trim() ?? null;
				const startDate = url.searchParams.get('startDate')?.trim() ?? null;
				const endDate = url.searchParams.get('endDate')?.trim() ?? null;

				let sql = 'DELETE FROM ledger WHERE propertyId = ?1';
				const bindParams: unknown[] = [propertyId];
				let i = 2;

				if (type) {
					sql += ` AND type = ?${i}`;
					bindParams.push(type);
					i++;
				}

				if (startDate) {
					sql += ` AND date >= ?${i}`;
					bindParams.push(startDate);
					i++;
				}

				if (endDate) {
					sql += ` AND date < ?${i}`;
					bindParams.push(endDate);
					i++;
				}

				await env.DB.prepare(sql).bind(...bindParams).run();
				response = new Response(null, { status: 204 });
			}

			// POST /api/ledger
			if (request.method === 'POST' && parts.length === 2) {
				const body = (await request.json().catch(() => null)) as Partial<Ledger> | null;
				if (!body) return badRequest('Invalid JSON body');

				const id = crypto.randomUUID();
				const propertyId = body.propertyId as string;
				const userId = body.userId as string;
				const date = body.date as string;
				const type = body.type as string;
				let amount = body.amount as number;

				if (!propertyId) return badRequest('propertyId is required');
				if (!userId) return badRequest('userId is required');
				if (!date) return badRequest('date is required');
				if (!type) return badRequest('type is required');
				if (amount === undefined || typeof amount !== 'number' || isNaN(amount)) return badRequest('invalid amount');

				if (type.startsWith('expense:')) {
					amount = -Math.abs(amount);
				} else if (type.startsWith('income:')) {
					amount = Math.abs(amount);
				}

				await env.DB
					.prepare('INSERT INTO ledger (id, propertyId, userId, date, type, amount) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
					.bind(id, propertyId, userId, date, type, amount)
					.run();

				response = json({ id, propertyId, userId, date, type, amount }, { status: 201 });
			}

			response = methodNotAllowed();
		}

		response = notFound();

		return withCors(request, response);
	},
} satisfies ExportedHandler<Env>;
