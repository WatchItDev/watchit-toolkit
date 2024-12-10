jq --compact-output '.manifest[]' $1 | while read i; do

    input="${i//\"}"
    data=$(ipfs ipfs cat ${input})
    video=$(jq --raw-output '.s.cid' <<<$data)
    small=$(jq --raw-output '.x.attachments[0].cid' <<<$data)
    medium=$(jq --raw-output '.x.attachments[1].cid' <<<$data)
    large=$(jq --raw-output '.x.attachments[2].cid' <<<$data)
    wallpaper=$(jq --raw-output '.x.attachments[3].cid' <<<$data)

    echo $data
    ipfs pin add $input;
    ipfs pin add $small
    ipfs pin add $medium
    ipfs pin add $large
    ipfs pin add $wallpaper
    echo "Pinned images"

    ipfs pin add $video
    echo "Pinned video"
    echo "Finished pinning"

done
