import { connect } from '@planetscale/database';

async function handleTaskRequest(request, env) {
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
			return handleGetTasks(request, conn);
		case 'POST':
			return handlePostTaskEntry(request, conn);
		case 'DELETE':
			return handleDeleteTask(request, conn);
		default:
			return new Response('Invalid request method', {
				headers: { 'content-type': 'text/plain' },
				status: 400, // Bad Request
			});
	}
	async function handleGetTasks(request, conn) {
		try {
			const url = new URL(request.url);
			const userId = url.searchParams.get('userId');
			const task_category = url.searchParams.get('task_category');
			const count = url.searchParams.get('count');
			const search_str = url.searchParams.get('search_str');
			const time_range = url.searchParams.get('time_range');
			const sort_priority = url.searchParams.get('sort_priority');

			if (!userId) {
				return new Response('Missing user id', {
					headers: {
						'content-type': 'text/plain',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
					status: 400,
				});
			}

			let sqlQuery = `SELECT * FROM TaskEntry WHERE userId = ? `;
			let queryParams = [userId];

			// Text Search
			if (search_str) {
				sqlQuery += 'AND task_title LIKE ? ';
				queryParams.push('%' + search_str + '%');
			}

			// Task Category Filtering
			if (task_category) {
				sqlQuery += 'AND task_category = ? ';
				queryParams.push(task_category);
			}

			// Time Range Filtering
			if (time_range) {
				let startDate = new Date();
				let endDate = new Date();
				startDate.setHours(startDate.getHours() - 24); // Start from 24 hours ago
				switch (time_range.toLowerCase()) {
					case 'today':
						endDate.setHours(endDate.getHours() + 24); // 24 hours from last 24 hours, i.e., today
						break;
					case 'tomorrow':
						endDate.setHours(endDate.getHours() + 48); // 48 hours from last 24 hours
						break;
					case 'this_week':
						endDate.setHours(endDate.getHours() + 24 * 7); // 1 week from last 24 hours
						break;
					case 'this_month':
						endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours()); // 1 month from last 24 hours
						break;
					default:
						break;
				}
				sqlQuery += 'AND task_date BETWEEN ? AND ? ';
				queryParams.push(startDate.toISOString().slice(0, 19).replace('T', ' '), endDate.toISOString().slice(0, 19).replace('T', ' '));
			}

			// Sorting
			sqlQuery += 'ORDER BY ';
			if (sort_priority) {
				sqlQuery += 'task_priority DESC, ';
			}
			sqlQuery += 'task_creation_date DESC ';

			if (count) {
				sqlQuery += 'LIMIT ?';
				queryParams.push(parseInt(count));
			}

			const tasksResult = await conn.execute(sqlQuery, queryParams);

			if (tasksResult.error) {
				return new Response(tasksResult.error, {
					headers: {
						'content-type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
					status: 500,
				});
			}

			return new Response(JSON.stringify(tasksResult.rows), {
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
				status: 500,
			});
		}
	}
	async function handlePostTaskEntry(request, conn) {
		try {
			const url = new URL(request.url);
			const task_title = url.searchParams.get('task_title');
			const userId = url.searchParams.get('userId');
			const task_category = url.searchParams.get('task_category');
			const task_priority = parseInt(url.searchParams.get('task_priority'));
			const task_date = url.searchParams.get('task_date');
			const task_desc = url.searchParams.get('task_desc');

			let task_creation_date = new Date();
			task_creation_date.setHours(task_creation_date.getHours() + 5);
			task_creation_date.setMinutes(task_creation_date.getMinutes() + 30);
			task_creation_date = task_creation_date.toISOString().slice(0, 19).replace('T', ' ');

			const insertResult = await conn.execute(
				'INSERT INTO TaskEntry (task_title, task_creation_date, task_category, task_priority, task_date, task_desc, userId) VALUES (?, ?, ?, ?, ?, ?, ?);',
				[task_title, task_creation_date, task_category, task_priority, task_date, task_desc, userId]
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

			return new Response('Task entry was added successfully', {
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
	async function handleDeleteTask(request, conn) {
		try {
			const url = new URL(request.url);
			const task_id = url.searchParams.get('task_id'); // Get the id from URL parameters

			if (!task_id) {
				return new Response('Missing task id', {
					headers: {
						'content-type': 'text/plain',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
					status: 400, // Bad Request
				});
			}

			const deleteResult = await conn.execute('DELETE FROM TaskEntry WHERE task_id = ?;', [task_id]);

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
				return new Response('No task entry was found with id: ' + id, {
					headers: {
						'content-type': 'text/plain',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					},
					status: 404, // Not Found
				});
			}

			return new Response('Task entry was deleted successfully', {
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

export default handleTaskRequest;
