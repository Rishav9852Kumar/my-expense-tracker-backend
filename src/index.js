import { Router } from 'itty-router';
import handleRequest from './accounts/user.js';
import handleExpenseRequest from './event/expenseEvent.js';
import handleCategoryRequest from './category/expenseCategory.js'

// Router
const router = Router();

// User Routes
router.get('/user', (request, env) => handleRequest(request, env));
router.post('/user', (request, env) => handleRequest(request, env));

// Add Expenses Event Routes
router.get('/event', (request, env) => handleExpenseRequest(request, env));
router.post('/event', (request, env) => handleExpenseRequest(request, env));

// Add Expenses Category Routes
router.get('/category', (request, env) => handleCategoryRequest(request, env));
router.post('/category', (request, env) => handleCategoryRequest(request, env));

export default {
	async fetch(request, env, ctx) {
		const result = await router.handle(request, env, ctx);

		if (!result) {
			return new Response('Invalid URL', { status: 404 });
		}

		return result;
	},
};
