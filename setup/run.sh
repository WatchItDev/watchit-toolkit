
echo "
[Unit]
Description=IPFS Daemon
After=syslog.target network.target remote-fs.target nss-lookup.target

[Service]
ExecStart=/usr/local/bin/ipfs daemon --enable-namesys-pubsub --enable-pubsub-experiment --migrate
User=$(whoami)
Restart=always
LimitNOFILE=10240

[Install]
WantedBy=multi-user.target
" >  ipfs.service


sudo cp ./ipfs.service /etc/systemd/system/ipfs.service
sudo systemctl daemon-reload
sudo systemctl enable ipfs
sudo systemctl start ipfs
sudo systemctl status ipfs