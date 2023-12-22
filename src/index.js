import { Router } from 'itty-router';
import handleRequest from './accounts/user.js';
import handleExpenseRequest from './event/expenseEvent.js';
import handleCategoryRequest from './category/expenseCategory.js';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	'Access-Control-Max-Age': '86400',
};

// Router
const router = Router();

// User Routes
router.get('/user', (request, env) => handleRequest(request, env));
router.post('/user', (request, env) => handleRequest(request, env));

// Add Expenses Event Routes
router.get('/event', (request, env) => handleExpenseRequest(request, env));
router.post('/event', (request, env) => handleExpenseRequest(request, env));
router.delete('/event', (request, env) => handleExpenseRequest(request, env));

// Add Expenses Category Routes
router.get('/category', (request, env) => handleCategoryRequest(request, env));
router.post('/category', (request, env) => handleCategoryRequest(request, env));

export default {
	async fetch(request, env, ctx) {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		let result;
		try {
			result = await router.handle(request, env, ctx);
		} catch (e) {
			return new Response('Error thrown inside request handler: ' + e.message, { status: 500, headers: corsHeaders });
		}

		if (!result) {
			return new Response('Not found', { status: 404, headers: corsHeaders });
		}

		// Ensure all responses have CORS headers
		const response = new Response(result.body, {
			...result,
			headers: {
				...result.headers,
				...corsHeaders,
			},
		});
		return response;
	},
};
