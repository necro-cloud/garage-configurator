import k8s from "@kubernetes/client-node";
import { faker } from "@faker-js/faker";
import { readFile } from "fs/promises";
import sleep from "./utilities/miscelleneous/sleep";
import { checkStatefulSetClusterStatus } from "./utilities/kubernetes/statefulset";
import {
	checkGarageClusterStatus,
	getClusterStatus,
	updateClusterLayout,
	applyClusterLayout,
} from "./utilities/garage/cluster";
import { getBucketInfo, createBucket } from "./utilities/garage/buckets";
import { getKeyInfo, createKey } from "./utilities/garage/keys";
import type { UpdateClusterLayoutDto } from "./utilities/garage/cluster";

//----------------- GLOBAL VARIABLES PULLED OUT OF THE CONFIGURATION FILE ----------------- //
let GARAGE_ADMIN_API_URL = "http://localhost:3903";
let GARAGE_KUBERNETES_CLUSTER_NAME = "garage";
let GARAGE_KUBERNETES_NAMESPACE = "garage";
let GARAGE_KUBERNETES_DESIRED_REPLICAS = 1;
let GARAGE_STORAGE_PER_NODE_IN_GBS = 1;
let GARAGE_STORAGE_NODE_TAGS: Array<string> = [];
let GARAGE_STORAGE_BUCKETS: Array<string> = [];
let GARAGE_STORAGE_ACCESS_KEYS: Array<any> = [];
let GARAGE_STORAGE_ACCESS_KEYS_SECRET_ANNOTATIONS = {};
let GARAGE_STORAGE_ACCESS_KEYS_SECRET_LABELS = {};
let EXECUTION_MODE: string = process.env.EXECUTION_MODE ?? "testing";

// Kubernetes Client Setup based on testing
// or cluster environment the script is run on
const kc = new k8s.KubeConfig();

if (EXECUTION_MODE === "cluster") kc.loadFromCluster();
else kc.loadFromDefault();

const statefulSetApi = kc.makeApiClient(k8s.AppsV1Api);
// Global variables required for script execution
let bucketsInfo: any = {};
let keysInfo: any = {};

// Read the configuration file and pull required
// configuration for the Garage Cluster to be configured
async function readAndSetConfiguration() {
	// Read file from path given as an environment variable
	// and parse it as a JSON file
	const configuratorRawJson = await readFile(
		process.env.CONFIGURATOR_JSON ?? "example-configuration.json",
		"utf-8",
	);
	const configuratorJson = JSON.parse(configuratorRawJson);

	// TODO: Additional validation to be done
	GARAGE_ADMIN_API_URL =
		configuratorJson["adminApiUrl"] ?? GARAGE_ADMIN_API_URL;
	GARAGE_KUBERNETES_CLUSTER_NAME =
		configuratorJson["k8sClusterName"] ?? GARAGE_KUBERNETES_CLUSTER_NAME;
	GARAGE_KUBERNETES_NAMESPACE =
		configuratorJson["k8sClusterNamespace"] ?? GARAGE_KUBERNETES_NAMESPACE;
	GARAGE_KUBERNETES_DESIRED_REPLICAS =
		Number(configuratorJson["desiredReplicas"]) ??
		GARAGE_KUBERNETES_DESIRED_REPLICAS;
	GARAGE_STORAGE_PER_NODE_IN_GBS =
		Number(configuratorJson["storagePerNodeInGBs"]) ??
		GARAGE_STORAGE_PER_NODE_IN_GBS;
	GARAGE_STORAGE_NODE_TAGS =
		configuratorJson["nodeTags"] ?? GARAGE_STORAGE_NODE_TAGS;
	GARAGE_STORAGE_BUCKETS =
		configuratorJson["buckets"] ?? GARAGE_STORAGE_BUCKETS;
	GARAGE_STORAGE_ACCESS_KEYS =
		configuratorJson["accessKeys"] ?? GARAGE_STORAGE_ACCESS_KEYS;
	GARAGE_STORAGE_ACCESS_KEYS_SECRET_LABELS =
		configuratorJson["accessKeysSecretLabels"] ??
		GARAGE_STORAGE_ACCESS_KEYS_SECRET_LABELS;
	GARAGE_STORAGE_ACCESS_KEYS_SECRET_ANNOTATIONS =
		configuratorJson["accessKeysSecretAnnotations"] ??
		GARAGE_STORAGE_ACCESS_KEYS_SECRET_ANNOTATIONS;

	// Logging
	console.log("########## Configuring Garage with these settings ##########");
	console.log(`Garage Admin API URL: ${GARAGE_ADMIN_API_URL}`);
	console.log(
		`Garage Kubernetes Cluster Name: ${GARAGE_KUBERNETES_CLUSTER_NAME}`,
	);
	console.log(`Garage Kubernetes Namespace: ${GARAGE_KUBERNETES_NAMESPACE}`);
	console.log(
		`Garage Kubernetes Desired Replicas: ${GARAGE_KUBERNETES_DESIRED_REPLICAS}`,
	);
	console.log(
		`Garage Storage Per Node in GBs: ${GARAGE_STORAGE_PER_NODE_IN_GBS}`,
	);
	console.log(`Garage Storage Node Tags: ${GARAGE_STORAGE_NODE_TAGS}`);
	console.log(
		`Garage Storage Buckets to be Created: ${GARAGE_STORAGE_BUCKETS}`,
	);
	console.log(
		`Garage Storage Access Keys to be Created: ${JSON.stringify(GARAGE_STORAGE_ACCESS_KEYS)}`,
	);
	console.log("Garage Storage Access Keys Secret Labels to be Used:");
	console.log(GARAGE_STORAGE_ACCESS_KEYS_SECRET_LABELS);
	console.log("Garage Storage Access Keys Secret Annotations to be Used:");
	console.log(GARAGE_STORAGE_ACCESS_KEYS_SECRET_ANNOTATIONS);
	console.log(
		"---------------------------------------------------------------------",
	);
}

// Method to check Garage StatefulSet and Cluster Status
// before proceeding to configure the cluster
async function checkGarageStatus() {
	console.log(
		"########## Checking Garage StatefulSet and Cluster Status and waiting for it to be ready ##########",
	);

	let tries = 1;

	// Check 10 times if the stateful set
	// is ready to go or not
	while (
		!(await checkStatefulSetClusterStatus(
			statefulSetApi,
			GARAGE_KUBERNETES_CLUSTER_NAME,
			GARAGE_KUBERNETES_NAMESPACE,
			GARAGE_KUBERNETES_DESIRED_REPLICAS,
		)) &&
		tries <= 10
	) {
		// Sleep and check again if StatefulSet is not ready
		console.log(
			"Garage StatefulSet is not ready...Checking in after 30 seconds",
		);
		await sleep(30000);
		tries += 1;
	}

	console.log("Garage StatefulSet is ready! Checking Garage Status...");

	// Same strategy for the Garage Cluster as well
	while (
		!(await checkGarageClusterStatus(GARAGE_ADMIN_API_URL)) &&
		tries <= 10
	) {
		console.log("Garage Cluster is not ready...Checking in after 5 seconds");
		await sleep(5000);
		tries += 1;
	}

	console.log("Garage Cluster is ready!");
	console.log(
		"---------------------------------------------------------------------",
	);
}

// Method to setup the cluster nodes with a proper layout
// along with capacity, tags and zone names for the same
async function setupGarageClusterNodes() {
	console.log(
		"########## Setting up nodes to form a proper Garage Cluster ##########",
	);

	// Fetch cluster status as it also contains all node details as well
	const clusterStatusResult = await getClusterStatus(GARAGE_ADMIN_API_URL);

	// If the request errored out, stop the script
	if (clusterStatusResult["status"] === "error") {
		throw Error(
			`Garage Cluster is facing some issues. Error: ${clusterStatusResult["response"]}`,
		);
	}

	// Pull cluster status and current layout version from the response
	const clusterStatus = clusterStatusResult["response"];
	const currentLayoutVersion = Number(clusterStatus["layoutVersion"]);

	// New Layout Details for the cluster
	const clusterLayoutDetails: Array<UpdateClusterLayoutDto> = [];

	// Loop through nodes and assign them capacity
	// zone and tags if present
	clusterStatus["nodes"].forEach((node: any) => {
		const nodeId: string = node["id"];

		if (nodeId === null)
			throw Error(`Garage Cluster Node ID is null. Node details: ${node}`);

		console.log(`Discovered Garage Node with ID: ${nodeId}`);
		clusterLayoutDetails.push({
			id: nodeId,
			capacity: GARAGE_STORAGE_PER_NODE_IN_GBS * 1000000000,
			zone: `${faker.word.adverb()}-${faker.word.noun()}`,
			tags: GARAGE_STORAGE_NODE_TAGS,
		});
	});

	console.log("Setting up the Garage Nodes with the following details:");
	console.log(clusterLayoutDetails);

	// Propose layout changes to the Garage Cluster
	const updateGarageClusterLayoutResponse = await updateClusterLayout(
		GARAGE_ADMIN_API_URL,
		clusterLayoutDetails,
	);
	if (updateGarageClusterLayoutResponse["response"] != "success") {
		console.log("Garage Storage Layout Update Success! Applying Layout...");
	} else {
		throw Error(
			`Garage Storage Layout Update Failure: ${JSON.stringify(updateGarageClusterLayoutResponse["response"])}`,
		);
	}

	// Apply new layout to the cluster
	const applyGarageClusterLayoutResponse = await applyClusterLayout(
		GARAGE_ADMIN_API_URL,
		currentLayoutVersion + 1,
	);
	if (applyGarageClusterLayoutResponse["response"] != "success") {
		console.log("Garage Storage Layout Apply Success!");
	} else {
		throw Error(
			`Garage Storage Layout Apply Failure: ${JSON.stringify(updateGarageClusterLayoutResponse["response"])}`,
		);
	}

	console.log(
		"---------------------------------------------------------------------",
	);
}

// Method to create the buckets based on the configuration provided
async function createBuckets() {
	console.log(
		"########## Creating required buckets on the Garage Cluster ##########",
	);

	// Loop against the list of buckets
	for (const bucket of GARAGE_STORAGE_BUCKETS) {
		console.log(`Checking if bucket: ${bucket} exists or not...`);

		// Checking if bucket already exists or not
		const getBucketInfoResponse = await getBucketInfo(
			GARAGE_ADMIN_API_URL,
			bucket,
		);

		if (getBucketInfoResponse["status"] === "not-found") {
			console.log(`Bucket: ${bucket} does not exists, creating bucket`);

			// Create the bucket if it does not exist
			const createBucketResponse = await createBucket(
				GARAGE_ADMIN_API_URL,
				bucket,
			);
			if (createBucketResponse["status"] === "success") {
				console.log(`Bucket: ${bucket} successfully created!`);

				// Add bucket info to a list, to be used later on
				bucketsInfo[bucket] = createBucketResponse["response"];
			} else {
				throw Error(
					`Garage Storage Bucket Creation Failure: ${JSON.stringify(createBucketResponse["response"])}`,
				);
			}
		} else if (getBucketInfoResponse["status"] === "success") {
			// Add bucket info to a list, to be used later on
			bucketsInfo[bucket] = getBucketInfoResponse["response"];
			console.log(`Bucket: ${bucket} already exists`);
		} else {
			throw Error(
				`Garage Storage Bucket Info Failure: ${JSON.stringify(getBucketInfoResponse["response"])}`,
			);
		}
	}

	console.log(
		"---------------------------------------------------------------------",
	);
}

// Method to create access keys based on the configuration provided
async function createAccessKeys() {
	console.log(
		"########## Creating required access keys on the Garage Cluster ##########",
	);

	// Loop against keys to be created
	for (const accessKey of GARAGE_STORAGE_ACCESS_KEYS) {
		console.log(
			`Checking if access key: ${accessKey["name"]} exists or not...`,
		);

		// Check if access key already exists or not
		const getKeyInfoResponse = await getKeyInfo(
			GARAGE_ADMIN_API_URL,
			accessKey["name"],
		);

		if (getKeyInfoResponse["status"] === "not-found") {
			console.log(
				`Access Key: ${accessKey["name"]} does not exists, creating access key`,
			);

			// Create access key if it does not exist already
			const createKeyResponse = await createKey(
				GARAGE_ADMIN_API_URL,
				accessKey["name"],
				Boolean(accessKey["createBucket"]),
			);
			if (createKeyResponse["status"] === "success") {
				console.log(`Access Key: ${accessKey["name"]} successfully created!`);

				// Add access key info to a list, to be used later on
				keysInfo[accessKey["name"]] = createKeyResponse["response"];
			} else {
				throw Error(
					`Garage Storage Key Creation Failure: ${JSON.stringify(createKeyResponse["response"])}`,
				);
			}
		} else if (getKeyInfoResponse["status"] === "success") {
			// Add access key info to a list, to be used later on
			keysInfo[accessKey["name"]] = getKeyInfoResponse["response"];
			console.log(`Access Key: ${accessKey["name"]} already exists`);
		} else {
			throw Error(
				`Garage Storage Key Info Failure: ${JSON.stringify(getKeyInfoResponse["response"])}`,
			);
		}
	}

	console.log(
		"---------------------------------------------------------------------",
	);
}

// Driver script
async function main() {
	await readAndSetConfiguration();
	await checkGarageStatus();
	await setupGarageClusterNodes();
	await createBuckets();
	await createAccessKeys();
}

main();
