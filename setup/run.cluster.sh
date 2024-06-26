
echo "
[Unit]
Description=IPFS Cluster Daemon
After=syslog.target network.target remote-fs.target nss-lookup.target

[Service]
ExecStart=/usr/local/bin/ipfs-cluster-service daemon
User=$(whoami)
Restart=always
LimitNOFILE=10240

[Install]
WantedBy=multi-user.target
" >  ipfscluster.service


sudo cp ./ipfscluster.service /etc/systemd/system/ipfscluster.service
sudo systemctl daemon-reload
sudo systemctl enable ipfscluster
sudo systemctl start ipfscluster
sudo systemctl status ipfscluster