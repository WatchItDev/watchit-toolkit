jq --compact-output '.manifest[]' $1 | while read i; do

    data=$(ipfs cat "${i//\"}")
    video=$(jq --raw-output '.s.cid' <<<$data)
    small=$(jq --raw-output '.x.attachments[0].cid' <<<$data)
    medium=$(jq --raw-output '.x.attachments[1].cid' <<<$data)
    large=$(jq --raw-output '.x.attachments[2].cid' <<<$data)

    ipfs pin add $small
    ipfs pin add $medium
    ipfs pin add $large
    echo "Pinned images"

    ipfs pin add $video
    echo "Pinned video"
    echo "Finished pinning"

done
