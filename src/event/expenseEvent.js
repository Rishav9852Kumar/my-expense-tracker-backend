import { connect } from '@planetscale/database';

async function handleExpenseRequest(request, env) {
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
			return handleDeleteExpense(request, conn);
		case 'POST':
			return handlePostExpenseEntry(request, conn);
		default:
			return new Response('Invalid request method', {
				headers: { 'content-type': 'text/plain' },
				status: 400, // Bad Request
			});
	}
	async function handlePostExpenseEntry(request, conn) {
		try {
			const url = new URL(request.url);
			const expense_title = url.searchParams.get('expense_title');
			const userId = url.searchParams.get('userId');
			const expense_category = url.searchParams.get('expense_category');
			const expense_amount = parseInt(url.searchParams.get('expense_amount'));
			const expense_desc = url.searchParams.get('expense_desc');
			let star_marked_param = url.searchParams.get('star_marked');
			const star_marked = star_marked_param ? star_marked_param.toLowerCase() === 'true' : false;

			const expense_creation_date = new Date().toISOString().slice(0, 19).replace('T', ' ');

			const insertResult = await conn.execute(
				'INSERT INTO ExpenseEntry (expense_title, expense_creation_date, expense_category, expense_amount, expense_desc, star_marked, userId) VALUES (?, ?, ?, ?, ?, ?, ?);',
				[expense_title, expense_creation_date, expense_category, expense_amount, expense_desc, star_marked, userId]
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

			return new Response('Expense entry was added successfully', {
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
	async function handleDeleteExpense(request, conn) {
		try {
			const url = new URL(request.url);
			const expense_id = url.searchParams.get('expense_id'); // Get the id from URL parameters

			if (!expense_id) {
				return new Response('Missing Expense Entry id', {
					headers: {
						'content-type': 'text/plain',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
					status: 400, // Bad Request
				});
			}

			const deleteResult = await conn.execute('DELETE FROM ExpenseEntry WHERE expense_id = ?;', [expense_id]);

			if (deleteResult.error) {
				return new Response(deleteResult.error, {
					headers: {
						'content-type': 'text/plain',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
					status: 500, // Internal Server Error
				});
			}

			if (deleteResult.affectedRows === 0) {
				return new Response('No Expense Entry found with id: ' + id, {
					headers: {
						'content-type': 'text/plain',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
					status: 404, // Not Found
				});
			}

			return new Response('Expense Entry was deleted successfully', {
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
}

export default handleExpenseRequest;
