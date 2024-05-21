#!/bin/bash
# get my public ip
ip=$(dig +short txt ch whoami.cloudflare @1.0.0.1 | tr -d '"')
peers=$(cat peers.json)
mounts=$(cat mount.json)

sudo sysctl -w net.core.wmem_max=7500000
export IPFS_PATH=${1:-~/ipfsdata}

if ! command -v -- "ipfs" >/dev/null; then
       echo "Intalling ipfs"
       wget https://dist.ipfs.tech/kubo/v0.28.0/kubo_v0.28.0_linux-amd64.tar.gz
       tar -xvzf kubo_v0.28.0_linux-amd64.tar.gz

       cd kubo
       bash install.sh
       ipfs --version
fi

if [! -e "${IPFS_PATH}/plugins/go-ds-s3-plugin"]; then
       echo "Intalling S3 datasource"
       wget https://github.com/ipfs/go-ds-s3/releases/download/go-ds-s3-plugin%2Fv0.28.0/go-ds-s3-plugin_v0.28.0_linux_amd64.tar.gz
       tar -xvzf go-ds-s3-plugin_v0.28.0_linux_amd64.tar.gz
       mkdir -p ${IPFS_PATH}/plugins
       cp go-ds-s3-plugin/go-ds-s3-plugin ${IPFS_PATH}/plugins
fi

echo "Running ipfs in ${IPFS_PATH}"
[ ! -e $IPFS_PATH ] && ipfs init --empty-repo

# shellcheck disable=SC2006
# http://docs.ipfs.tech.ipns.localhost:8080/how-to/peering-with-content-providers/#content-provider-list
ipfs config Peering.Peers "$peers" --json
ipfs config Addresses.API '/ip4/127.0.0.1/tcp/5001'
ipfs config Addresses.Gateway '/ip4/127.0.0.1/tcp/8080'

ipfs config Datastore.Spec.mounts "$mounts" --json

# # shellcheck disable=SC2016
ipfs config Addresses.AppendAnnounce "[
       \"/ip4/$ip/tcp/4001\",
       \"/ip4/$ip/udp/4001/quic\",
       \"/ip4/$ip/udp/4001/quic-v1\",
       \"/ip4/$ip/udp/4001/quic-v1/webtransport\"
]" --json

ipfs config Swarm.ConnMgr.LowWater 30 --json
ipfs config Swarm.ConnMgr.HighWater 50 --json

ipfs config Swarm.AddrFilters '[
       "/ip4/100.64.0.0/ipcidr/10",
       "/ip4/169.254.0.0/ipcidr/16",
       "/ip4/198.18.0.0/ipcidr/15",
       "/ip4/198.51.100.0/ipcidr/24",
       "/ip4/203.0.113.0/ipcidr/24",
       "/ip4/240.0.0.0/ipcidr/4",
       "/ip6/100::/ipcidr/64",
       "/ip6/2001:2::/ipcidr/48",
       "/ip6/2001:db8::/ipcidr/32",
       "/ip6/fc00::/ipcidr/7",
       "/ip6/fe80::/ipcidr/10"
]' --json

ipfs config Datastore.GCPeriod "144h"
ipfs config Datastore.StorageMax "3000GB"
ipfs config Datastore.StorageGCWatermark 99 --json
ipfs config Pubsub.Router "gossipsub"
ipfs config --json Swarm.DisableBandwidthMetrics false
ipfs daemon --migrate
