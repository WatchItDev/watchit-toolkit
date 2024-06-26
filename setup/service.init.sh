if ! command -v -- "ipfs-cluster-ctl" > /dev/null; then
       echo "Intalling ipfs cluster ctl"
       wget https://dist.ipfs.tech/ipfs-cluster-ctl/v1.1.1/ipfs-cluster-ctl_v1.1.1_linux-amd64.tar.gz
       tar -xvzf ipfs-cluster-ctl_v1.1.1_linux-amd64.tar.gz

       cd ipfs-cluster-ctl
        # we need sudo to move the file to /usr/local/bin otherwise is copied to home/.local
       sudo cp ipfs-cluster-ctl /usr/local/bin/
       ipfs-cluster-ctl --version
fi

if ! command -v -- "ipfs-cluster-service" > /dev/null; then
       echo "Intalling cluster ipfs service"
       wget https://dist.ipfs.tech/ipfs-cluster-service/v1.1.1/ipfs-cluster-service_v1.1.1_linux-amd64.tar.gz
       tar -xvzf ipfs-cluster-service_v1.1.1_linux-amd64.tar.gz

       cd ipfs-cluster-service
        # we need sudo to move the file to /usr/local/bin otherwise is copied to home/.local
       sudo cp ipfs-cluster-service /usr/local/bin/
       ipfs-cluster-service --version
       ipfs-cluster-service init --consensus crdt
fi

ipfs-cluster-service daemon 