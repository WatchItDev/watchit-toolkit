# IPFS Cluster Follower Instance Creation Guide

**Command to create a follower instance in IPFS Cluster**

Before using this command, ensure you have [installed](https://docs.ipfs.tech/install/) and deployed your own local IPFS node.

This guide will help you to deploy a follower instance in an existing IPFS Cluster.
> Current template CID: `QmbyeQuK5A4Wf4hSqeBoCc4pzCQYNSRQv4d2xyCs9mXqN9`

**Usage:**

```bash
ipfs-cluster-follow <clusterName> run --init [<template-configuration-url>]
```

**Parameters:**

- `<clusterName>`: (Required) The name of the IPFS Cluster to which the follower instance will be added.
- `[<template-configuration-url>]`: (Optional) The URL of the template configuration file for the follower instance. If not provided, the default configuration will be used.

**Example:**

```bash
# Create a follower instance using the template configuration from the local node
ipfs-cluster-follow myCluster run --init http://127.0.0.1:8080/ipfs/QmbyeQuK5A4Wf4hSqeBoCc4pzCQYNSRQv4d2xyCs9mXqN9
```

**Note:**

- Make sure to replace `<clusterName>` with the actual name of your IPFS Cluster.
- The `<template-configuration-url>` should point to a valid IPFS CID or a URL that contains the template configuration file.
- The command should be executed in the terminal or command prompt where IPFS Cluster is installed and running.

Note: You can explore some other utility scripts in our `/script` folder
