jq --compact-output '.manifest[]' $1 | while read i; do
    video=$(jq --raw-output '.video' <<<$i)
    data=$(jq --raw-output '.data' <<<$i)
    small=$(jq --raw-output '.images.small' <<<$i)
    medium=$(jq --raw-output '.images.medium' <<<$i)
    large=$(jq --raw-output '.images.large' <<<$i)

    ipfs-cluster-ctl pin add $data
    echo "Pinned data"
    ipfs-cluster-ctl pin add $small
    ipfs-cluster-ctl pin add $medium
    ipfs-cluster-ctl pin add $large
    echo "Pinned images"
    ipfs-cluster-ctl pin add $video
    echo "Pinned video"
    echo "Finished pinning"

done
