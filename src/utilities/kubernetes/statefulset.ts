import type k8s from "@kubernetes/client-node";

// Method to check StatefulSet if the number
// of ready replicas is the same as the desired amount
export async function checkStatefulSetClusterStatus(
	statefulSetApi: k8s.AppsV1Api,
	garageKubernetesClusterName: string,
	garageKubernetesNameSpace: string,
	garageKubernetesDesiredReplicas: number,
) {
	const response = await statefulSetApi.readNamespacedStatefulSet({
		name: garageKubernetesClusterName,
		namespace: garageKubernetesNameSpace,
	});

	if (response.status?.readyReplicas === garageKubernetesDesiredReplicas) {
		return true;
	} else {
		return false;
	}
}
