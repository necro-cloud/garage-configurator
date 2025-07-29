import k8s from "@kubernetes/client-node";

// Method to create access key secrets
export async function getKubernetesSecret(
	secretsApi: k8s.CoreV1Api,
	name: string,
	namespace: string,
) {
	try {
		const secretResponse = await secretsApi.readNamespacedSecret({
			name,
			namespace,
		});

		return {
			status: "success",
			response: secretResponse,
		};
	} catch (error: any) {
		if (JSON.parse(error.body)["code"] === 404)
			return {
				status: "not-found",
				response: {},
			};
		else
			return {
				status: "error",
				response: error.body,
			};
	}
}

// Method to create access key secrets
export async function createKubernetesSecret(
	secretsApi: k8s.CoreV1Api,
	name: string,
	namespace: string,
	annotations: { [key: string]: string },
	labels: { [key: string]: string },
	data: any,
) {
	try {
		const secretResponse = await secretsApi.createNamespacedSecret({
			namespace,
			body: {
				metadata: {
					name,
					namespace,
					annotations,
					labels,
				},
				data,
				type: "Opaque",
			},
		});

		return {
			status: "success",
			response: secretResponse,
		};
	} catch (error: any) {
		return {
			status: "error",
			response: error.body,
		};
	}
}
