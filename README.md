# necronizer's cloud garage configurator

This repository contains code for automating various preliminary steps on Garage deployed on a Kubernetes Cluster before you can use it through [Garage's Administration APIs](https://garagehq.deuxfleurs.fr/documentation/reference-manual/admin-api/). These steps are:

1. Node discovery and configuration for each of the nodes
2. Creation of Buckets and Access Keys
3. Access Keys to be saved as a Kubernetes Secret
4. Permissions and accesses to be granted to the Access Keys

# Requirements and Dependencies

The following is required to start using this repository:
1. Kubernetes Cluster - Any kubernetes cluster can do, tested out with my [self hosted kubernetes cluster](https://github.com/necro-cloud/kubernetes)
2. Garage - Any garage cluster can do, tested out with my [garage module](https://github.com/necro-cloud/modules/tree/main/modules/garage)
3. PNPM - default package manager for this project, documentation for the same is [here](https://pnpm.io/motivation)

# Usage Instructions:

**Step 1:** Install all dependencies in the project using PNPM by running the command: `pnpm i`

**Step 2:** Setup a configuration file to be used to map out your garage installation, there is an [example configuration file](./example-configuration.json) present in the repository which can be used as a reference

**Step 3:** Run the following commands to set up your environment variables prior to execution of the script

```bash
# EXPORT THE PATH WHERE THE CONFIGURATION FILE IS PRESENT
export CONFIGURATOR_JSON="path/to/configurator.json"

# GARAGE ADMIN TOKEN TO INTERACT WITH THE ADMINISTRATION API
export GARAGE_ADMIN_TOKEN="token"

# RUN IN A TEST CONTEXT RATHER IN CLUSTER CONTEXT, REQUIRED FOR KUBERNETES CLIENT AUTHENTICATION
export EXECUTION_MODE="testing"

# (OPTIONAL) IF YOUR GARAGE IS BEHIND A PROXY UTILIZING SELF SIGNED/CUSTOM CA
export NODE_EXTRA_CA_CERTS=ca.crt
```

**Step 4:** Run the script by running the following command: `pnpm run:dev`
