// Method to fetch bucket details or return 404 is the bucket does not exist
export async function getBucketInfo(
	garageAdminApiUrl: string,
	globalAliasName: string,
) {
	const response = await fetch(
		`${garageAdminApiUrl}/v2/GetBucketInfo?globalAlias=${globalAliasName}`,
		{
			headers: {
				Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
			},
		},
	);

	return {
		status: response.ok
			? "success"
			: response.status === 404
				? "not-found"
				: "error",
		response: response.status === 404 ? {} : await response.json(),
	};
}

// Method to create a new bucket with the given global alias name
export async function createBucket(
	garageAdminApiUrl: string,
	globalAlias: string,
) {
	const response = await fetch(`${garageAdminApiUrl}/v2/CreateBucket`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			globalAlias,
		}),
	});

	return {
		status: response.ok ? "success" : "error",
		response: await response.json(),
	};
}
