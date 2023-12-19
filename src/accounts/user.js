import { connect } from '@planetscale/database';

async function handleRequest(request, env) {
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
			return handleGetRequest(request, conn);
		case 'POST':
			return handlePostRequest(request, conn);
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

// Api to Get a registered User
async function handleGetRequest(request, conn) {
	const url = new URL(request.url);
	const email = url.searchParams.get('email');
	const data = await conn.execute('SELECT * FROM MyExpenseUser where UserEmail = ?; ', [email]);
	if (data.error) {
		return new Response(data.error, {
			headers: {
				'content-type': 'text/plain',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
			status: 404, // Not Found
		});
	}
	if (data.rows.length === 0) {
		return new Response(JSON.stringify(data.rows), {
			status: 202, // User not found
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	}
	const result = await conn.execute('SELECT * FROM MyExpenseUser WHERE UserEmail = ?;', [email]);

	if (result.error) {
		return new Response(data.error, {
			headers: { 'content-type': 'text/plain' },
			status: 405, // Not Found
		});
	}
	return new Response(JSON.stringify(result.rows[0]), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	});
}

// API to add a new User
async function handlePostRequest(request, conn) {
	try {
		const url = new URL(request.url);
		const email = url.searchParams.get('email');
		const name = url.searchParams.get('name');

		// Check if the user already exists
		const userExists = await conn.execute('SELECT * FROM MyExpenseUser WHERE UserEmail = ?;', [email]);

		if (userExists.rows.length > 0) {
			await conn.execute('UPDATE MyExpenseUser SET UserName = ? WHERE UserEmail = ?;', [name, email]);

			const userData = await conn.execute('SELECT * FROM MyExpenseUser WHERE UserEmail = ?;', [email]);

			return new Response(JSON.stringify(userData.rows[0]), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
				status: 201, // user name updated // user already exists
			});
		}

		// User does not exist, proceed with the insert
		const newUser = {
			name: email,
			email: email,
			date: new Date(),
		};

		const data = await conn.execute('INSERT INTO MyExpenseUser (UserName, UserEmail, RegistrationDate) VALUES (?, ?, ?);', [
			newUser.name,
			newUser.email,
			newUser.date,
		]);

		if (data.error) {
			return new Response(data.error, {
				headers: {
					'content-type': 'text/plain',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
				status: 404, // Not Found
			});
		}

		// Fetch and return the inserted user data
		const insertedUserData = await conn.execute('SELECT * FROM MyExpenseUser WHERE UserEmail = ?;', [newUser.email]);

		if (insertedUserData.error) {
			return new Response(insertedUserData.error, {
				headers: {
					'content-type': 'text/plain',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
				status: 500, // Internal Server Error
			});
		}

		return new Response(JSON.stringify(insertedUserData.rows[0]), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	} catch (error) {
		return new Response(error + '\n' + request, {
			headers: {
				'content-type': 'text-plain',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
			status: 400, // Bad Request
		});
	}
}

export default handleRequest;
