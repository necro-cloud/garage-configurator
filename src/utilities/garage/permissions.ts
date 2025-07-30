// Method to assign keys permissions to the bucket
export async function assignPermissionsToAccessKeys(
	garageAdminApiUrl: string,
	accessKeyId: string,
	bucketId: string,
	permissions: { owner: boolean; read: boolean; write: boolean },
) {
	const response = await fetch(`${garageAdminApiUrl}/v2/AllowBucketKey`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			accessKeyId,
			bucketId,
			permissions,
		}),
	});

	return {
		status: response.ok ? "success" : "error",
		response: await response.json(),
	};
}
