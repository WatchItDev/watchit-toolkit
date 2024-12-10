jq --compact-output '.manifest[]' $1 | while read i; do

    input="${i//\"}"
    data=$(ipfs cat ${input})
    video=$(jq --raw-output '.s.cid' <<<$data)
    small=$(jq --raw-output '.x.attachments[0].cid' <<<$data)
    medium=$(jq --raw-output '.x.attachments[1].cid' <<<$data)
    large=$(jq --raw-output '.x.attachments[2].cid' <<<$data)
    wallpaper=$(jq --raw-output '.x.attachments[3].cid' <<<$data)

    echo $data
    docker-compose exec ipfs pin add $input;
    docker-compose exec ipfs pin add $small
    docker-compose exec ipfs pin add $medium
    docker-compose exec ipfs pin add $large
    docker-compose exec ipfs pin add $wallpaper
    echo "Pinned images"

    docker-compose exec ipfs pin add $video
    echo "Pinned video"
    echo "Finished pinning"

done
