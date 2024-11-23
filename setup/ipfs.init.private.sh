#!/bin/bash
# get my public ip
# peers=$(cat peers.json)
export IPFS_PROFILE=${2:local}
export IPFS_PATH=${1:-~/.ipfs}
export IPFS_BUCKET=${3:processing-hub}

ip=$(dig +short txt ch whoami.cloudflare @1.0.0.1 | tr -d '"')

if ! command -v -- "ipfs" >/dev/null; then
       echo "Intalling ipfs"
       wget https://dist.ipfs.tech/kubo/v0.28.0/kubo_v0.28.0_linux-amd64.tar.gz
       tar -xvzf kubo_v0.28.0_linux-amd64.tar.gz

       cd kubo 
        # we need sudo to move the file to /usr/local/bin otherwise is copied to home/.local
       sudo bash install.sh
       ipfs --version
      
fi

if [ ! -e /data/ipfs/plugins/go-ds-s3-plugin ]; then
       echo "Intalling S3 datasource"
       wget https://github.com/ipfs/go-ds-s3/releases/download/go-ds-s3-plugin%2Fv0.28.0/go-ds-s3-plugin_v0.28.0_linux_amd64.tar.gz
       tar -xvzf go-ds-s3-plugin_v0.28.0_linux_amd64.tar.gz
       mkdir -p ${IPFS_PATH}/plugins
       cp go-ds-s3-plugin/go-ds-s3-plugin ${IPFS_PATH}/plugins
fi

echo "Running mode ${IPFS_PROFILE}"
echo "Running ipfs in ${IPFS_PATH}"

if [ ! -e ${IPFS_PATH}/config ]; then
       ipfs init --empty-repo
fi

# shellcheck disable=SC2006
# http://docs.ipfs.tech.ipns.localhost:8080/how-to/peering-with-content-providers/#content-provider-list
# ipfs config Peering.Peers "$peers" --json
ipfs config Addresses.API '/ip4/0.0.0.0/tcp/5001'
ipfs config Addresses.Gateway '/ip4/0.0.0.0/tcp/8080'
ipfs bootstrap rm all

ipfs config --json Import.CidVersion '1'
ipfs config --json Experimental.FilestoreEnabled true
ipfs config --json Experimental.UrlstoreEnabled false

ipfs config Swarm.Transports.Network.Websocket --json true
ipfs config Swarm.Transports.Network.WebTransport --json true
ipfs config Swarm.Transports.Network.WebRTCDirect --json false
ipfs config Swarm.ConnMgr.LowWater 30 --json
ipfs config Swarm.ConnMgr.HighWater 50 --json

ipfs config Addresses.Swarm '[
       "/ip4/0.0.0.0/tcp/4001",
       "/ip6/::/tcp/4001",
       "/ip4/0.0.0.0/tcp/0/ws",
       "/ip4/0.0.0.0/udp/4001/quic-v1",
       "/ip4/0.0.0.0/udp/4001/quic-v1/webtransport",
       "/ip6/::/udp/4001/quic-v1",
       "/ip6/::/udp/4001/quic-v1/webtransport"
]' --json

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



echo "Running ipfs in server mode"
ipfs config profile apply announce-off

ipfs config AutoNAT.ServiceMode 'disabled' --json
ipfs config Gateway.DeserializedResponses true --bool
ipfs config Gateway.RootRedirect "" 
ipfs config Gateway.NoFetch true --bool
ipfs config Gateway.NoDNSLink false --bool
ipfs config Gateway.DeserializedResponses true --bool
# ipfs config Gateway.HTTPHeaders '{}' --json
# ipfs config Gateway.PublicGateways '{
#        "gw.watchit.movie": {
#               "UseSubdomains": false,
#               "Paths": ["/ipfs", "/ipns"]
#        }
# }' --json
ipfs config Datastore.BloomFilterSize "1048576" --json
ipfs config Datastore.Spec.mounts "[
       {
              \"child\": {
                     \"bucket\": \"$IPFS_BUCKET\",
                     \"region\": \"us-west-2\",
                     \"rootDirectory\": \"\",
                     \"accessKey\": \"\",
                     \"secretKey\":\"\",
                     \"type\": \"s3ds\"
              },
              \"mountpoint\": \"/blocks\",
              \"prefix\": \"s3.datastore\",
              \"type\": \"measure\"
       },
       {
              \"child\": {
                     \"compression\": \"none\",
                     \"path\": \"datastore\",
                     \"type\": \"levelds\"
              },
              \"mountpoint\": \"/\",
              \"prefix\": \"leveldb.datastore\",
              \"type\": \"measure\"
       }
]" --json



# https://github.com/nextcloud/all-in-one/discussions/1970
echo "net.core.rmem_max = 7500000" | sudo tee /etc/sysctl.d/ipfs.conf
sudo sysctl -w net.core.rmem_max=7500000
sudo sysctl -w net.core.wmem_max=7500000
sudo sysctl -p

ipfs config Datastore.GCPeriod "144h"
ipfs config Datastore.StorageMax "3000GB"
ipfs config Datastore.StorageGCWatermark 99 --json
ipfs config Pubsub.Router "gossipsub"
ipfs config --json Swarm.DisableBandwidthMetrics false

