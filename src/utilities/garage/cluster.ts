export interface UpdateClusterLayoutDto {
	id: string;
	capacity: number;
	zone: string;
	tags: Array<string>;
}

// Method to check Garage Cluster status
export async function checkGarageClusterStatus(garageAdminApiUrl: string) {
	const clusterStatus = await getClusterHealth(garageAdminApiUrl);

	if (clusterStatus["status"] === "error") {
		throw Error(
			`Garage Cluster is facing some issues. Error: ${clusterStatus["response"]}`,
		);
	}

	return clusterStatus["response"]["status"] === "healthy";
}

// Method to fetch Garage Cluster Health
export async function getClusterHealth(garageAdminApiUrl: string) {
	const response = await fetch(`${garageAdminApiUrl}/v2/GetClusterHealth`, {
		headers: {
			Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
		},
	});

	return {
		status: response.ok ? "success" : "error",
		response: await response.json(),
	};
}

// Method to fetch Garage Cluster Status which contains nodes details
export async function getClusterStatus(garageAdminApiUrl: string) {
	const response = await fetch(`${garageAdminApiUrl}/v2/GetClusterStatus`, {
		headers: {
			Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
		},
	});

	return {
		status: response.ok ? "success" : "error",
		response: await response.json(),
	};
}

// Method to update Garage Cluster Node Layout Details
export async function updateClusterLayout(
	garageAdminApiUrl: string,
	newLayout: Array<UpdateClusterLayoutDto>,
) {
	const response = await fetch(`${garageAdminApiUrl}/v2/UpdateClusterLayout`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			roles: newLayout,
		}),
	});

	return {
		status: response.ok ? "success" : "error",
		response: await response.json(),
	};
}

// Method to apply Garage Cluster Node Layout Details
export async function applyClusterLayout(
	garageAdminApiUrl: string,
	version: number = 1,
) {
	const response = await fetch(`${garageAdminApiUrl}/v2/ApplyClusterLayout`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.GARAGE_ADMIN_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			version: version,
		}),
	});

	return {
		status: response.ok ? "success" : "error",
		response: await response.json(),
	};
}
