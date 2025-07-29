// Method to fetch key info or 404 if it does not exist
export async function getKeyInfo(garageAdminApiUrl: string, keyName: string) {
	const response = await fetch(
		`${garageAdminApiUrl}/v2/GetKeyInfo?search=${keyName}&showSecretKey=true`,
		{
			headers: {
				Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
			},
		},
	);

	return {
		status: response.ok
			? "success"
			: response.status == 400
				? "not-found"
				: "error",
		response: response.status == 404 ? {} : await response.json(),
	};
}

// Method to create a new key with the given name
export async function createKey(
	garageAdminApiUrl: string,
	name: string,
	createBucket: boolean = false,
	neverExpires: boolean = true,
) {
	const response = await fetch(`${garageAdminApiUrl}/v2/CreateKey`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			name,
			neverExpires,
			createBucket,
		}),
	});

	return {
		status: response.ok ? "success" : "error",
		response: await response.json(),
	};
}
