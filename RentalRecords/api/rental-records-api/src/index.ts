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

	const allowedOrigins = new Set<string>([
		'http://127.0.0.1:50542',
		'http://localhost:50542',
		'https://rental-records-api.judahlibera.workers.dev',
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
		// CORS preflight
		if (request.method === 'OPTIONS') {
			return withCors(request, new Response(null, { status: 204 }));
		}

		const url = new URL(request.url);
		const parts = getPathParts(url);

		// Expect /api/...
		if (parts[0] !== 'api') return withCors(request, notFound());

		// GET /api/users/:login
		if (parts[1] === 'users' && parts.length === 3) {
			if (request.method !== 'GET') return withCors(request, methodNotAllowed());

			const login = decodeURIComponent(parts[2]).trim();
			if (!login) return withCors(request, badRequest('login is required'));

			const user = await env.DB
				.prepare('SELECT * FROM users WHERE login = ?1 LIMIT 1')
				.bind(login)
				.first<User>();

			return withCors(
				request,
				user ? json(user) : json({ error: 'User not found' }, { status: 404 }),
			);
		}

		// /api/properties/:userId
		if (parts[1] === 'properties') {
			if (request.method === 'GET' && parts.length === 3) {
				const userId = decodeURIComponent(parts[2]).trim();
				if (!userId) return withCors(request, badRequest('userId is required'));

				const result = await env.DB
					.prepare('SELECT * FROM properties WHERE userId = ?1')
					.bind(userId)
					.all<Property>();

				return withCors(request, json(result.results ?? []));
			}

			if (request.method === 'POST' && parts.length === 2) {
				const body = (await request.json().catch(() => null)) as Partial<Property>;
				if (!body) return withCors(request, badRequest('Invalid JSON body'));

				const id = crypto.randomUUID();
				const userId = body.userId as string;
				const number = body.number as string;
				const address = body.address as string;

				if (!userId) return withCors(request, badRequest('userId is required'));
				if (!number) return withCors(request, badRequest('number is required'));
				if (!address) return withCors(request, badRequest('address is required'));

				await env.DB
					.prepare('INSERT INTO properties (id, userId, number, address) VALUES (?1, ?2, ?3, ?4)')
					.bind(id, userId, number, address)
					.run();

				return withCors(request, json({ id, userId, number, address }, { status: 201 }));
			}

			return withCors(request, methodNotAllowed());
		}

		if (parts[1] === 'ledger') {
			if (request.method === 'GET' && parts.length === 3) {
				const propertyId = decodeURIComponent(parts[2]).trim();
				if (!propertyId) return withCors(request, badRequest('propertyId is required'));

				const result = await env.DB
					.prepare('SELECT * FROM ledger WHERE propertyId = ?1')
					.bind(propertyId)
					.all<Ledger>();

				return withCors(request, json(result.results ?? []));
			}

			if (request.method === 'DELETE' && parts.length === 3) {
				const id = decodeURIComponent(parts[2]).trim();
				if (!id) return withCors(request, badRequest('property id is required'));

				await env.DB
					.prepare('DELETE FROM ledger WHERE id = ?1')
					.bind(id)
					.run();

				return withCors(request, new Response(null, { status: 204 }));
			}

			if (request.method === 'DELETE' && parts.length === 2) {
				const propertyId = url.searchParams.get('propertyId')?.trim() ?? null;
				if (!propertyId) return withCors(request, badRequest('propertyId is required'));

				const type = url.searchParams.get('type')?.trim() ?? null;
				const startDate = url.searchParams.get('startDate')?.trim() ?? null;
				const endDate = url.searchParams.get('endDate')?.trim() ?? null;

				let sql = 'DELETE FROM ledger WHERE propertyId = ?1';
				const bindParams: unknown[] = [propertyId];
				let i = 2;

				if (type) { sql += ` AND type = ?${i}`; bindParams.push(type); i++; }
				if (startDate) { sql += ` AND date >= ?${i}`; bindParams.push(startDate); i++; }
				if (endDate) { sql += ` AND date < ?${i}`; bindParams.push(endDate); i++; }

				await env.DB.prepare(sql).bind(...bindParams).run();
				return withCors(request, new Response(null, { status: 204 }));
			}

			if (request.method === 'POST' && parts.length === 2) {
				const body = (await request.json().catch(() => null)) as Partial<Ledger> | null;
				if (!body) return withCors(request, badRequest('Invalid JSON body'));

				const id = crypto.randomUUID();
				const propertyId = body.propertyId as string;
				const userId = body.userId as string;
				const date = body.date as string;
				const type = body.type as string;
				let amount = body.amount as number;

				if (!propertyId) return withCors(request, badRequest('propertyId is required'));
				if (!userId) return withCors(request, badRequest('userId is required'));
				if (!date) return withCors(request, badRequest('date is required'));
				if (!type) return withCors(request, badRequest('type is required'));
				if (amount === undefined || typeof amount !== 'number' || isNaN(amount)) return withCors(request, badRequest('invalid amount'));

				if (type.startsWith('expense:')) amount = -Math.abs(amount);
				else if (type.startsWith('income:')) amount = Math.abs(amount);

				await env.DB
					.prepare('INSERT INTO ledger (id, propertyId, userId, date, type, amount) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
					.bind(id, propertyId, userId, date, type, amount)
					.run();

				return withCors(request, json({ id, propertyId, userId, date, type, amount }, { status: 201 }));
			}

			return withCors(request, methodNotAllowed());
		}

		return withCors(request, notFound());
	},
} satisfies ExportedHandler<Env>;
