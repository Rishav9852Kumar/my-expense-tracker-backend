import { connect } from '@planetscale/database';

async function handleCategoryRequest(request, env) {
	const config = {
		host: env.DATABASE_HOST,
		username: env.DATABASE_USERNAME,
		password: env.DATABASE_PASSWORD,
		fetch: (url, init) => {
			delete init['cache'];
			return fetch(url, init);
		},
	};
	const conn = connect(config);

	switch (request.method) {
		case 'GET':
			return handleGetCategoryRequest(request, conn);
		case 'POST':
			return handleCreateCategoryRequest(request, conn);
		default:
			return new Response('Invalid request method', {
				headers: {
					'content-type': 'text/plain',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
				status: 400, // Bad Request
			});
	}
}

async function handleCreateCategoryRequest(request, conn) {
	try {
		const url = new URL(request.url);
		const expense_category = url.searchParams.get('expense_category');
		const category_description = url.searchParams.get('category_description');
		const userId = parseInt(url.searchParams.get('userId'));
		const categoryColor = url.searchParams.get('categoryColor');
		const category_budget = parseInt(url.searchParams.get('category_budget') || '0');
		const edit = parseInt(url.searchParams.get('edit') || '0');

		// Checking if the category already exists for the user
		const existingCategories = await conn.execute('SELECT * FROM ExpenseCategory WHERE expense_category = ? AND userId = ?;', [
			expense_category,
			userId,
		]);
		const rows = existingCategories.rows;

		if (!rows || rows.length > 0) {
			if (edit === 1) {
				const updateResult = await conn.execute(
					'UPDATE ExpenseCategory SET category_description = ?, categoryColor = ?, category_budget = ? WHERE expense_category = ? AND userId = ?;',
					[category_description, categoryColor, category_budget, expense_category, userId]
				);

				if (updateResult.error) {
					return new Response(updateResult.error, {
						headers: {
							'content-type': 'text/plain',
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Headers': 'Content-Type, Authorization',
						},
						status: 500, // Internal Server Error
					});
				}

				const updatedCategories = await conn.execute('SELECT * FROM ExpenseCategory WHERE expense_category = ? AND userId = ?;', [
					expense_category,
					userId,
				]);

				return new Response(JSON.stringify(updatedCategories.rows), {
					status: 200,
					headers: {
						'content-type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
				});
			} else {
				return new Response('Category already exists', {
					status: 202, // Accepted
					headers: {
						'content-type': 'text/plain',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
				});
			}
		}

		const insertResult = await conn.execute(
			'INSERT INTO ExpenseCategory (expense_category, category_description, userId, categoryColor, category_budget) VALUES (?, ?, ?, ?, ?);',
			[expense_category, category_description, userId, categoryColor, category_budget]
		);

		if (insertResult.error) {
			return new Response(insertResult.error, {
				headers: {
					'content-type': 'text/plain',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
				status: 500, // Internal Server Error
			});
		}

		return new Response('Expense category was added successfully', {
			status: 200,
			headers: {
				'content-type': 'text/plain',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	} catch (error) {
		return new Response(error + '\n' + request, {
			headers: {
				'content-type': 'text/plain',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
			status: 500, // Internal Server Error
		});
	}
}

async function handleGetCategoryRequest(request, conn) {
	try {
		const url = new URL(request.url);
		const id = url.searchParams.get('id');
		const userId = url.searchParams.get('userId');

		let sqlQuery;
		let values;

		if (id) {
			sqlQuery = 'SELECT * FROM ExpenseCategory WHERE id = ?;';
			values = [id];
		} else if (userId) {
			sqlQuery = 'SELECT * FROM ExpenseCategory WHERE userId = ?;';
			values = [userId];
		} else {
			throw new Error('Missing id or userId in URL parameters');
		}

		const result = await conn.execute(sqlQuery, values);
		const rows = result.rows;

		if (!rows || rows.length === 0) {
			return new Response('No categories found', {
				status: 404,
				headers: {
					'content-type': 'text/plain',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		}

		return new Response(JSON.stringify(rows), {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	} catch (error) {
		return new Response(error + '\n' + request, {
			headers: {
				'content-type': 'text/plain',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
			status: 500, // Internal Server Error
		});
	}
}
export default handleCategoryRequest;
