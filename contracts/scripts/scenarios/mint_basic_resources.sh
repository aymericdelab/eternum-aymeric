#!/bin/bash

# mints 1000 of some resources for a relam 

read -p "Enter entityId: " entity_1_id

world="$SOZO_WORLD"

commands=(
    # realm 1
    "sozo execute --world $world MintResources --account-address $DOJO_ACCOUNT_ADDRESS --calldata $entity_1_id,2,1000"
    "sozo execute --world $world MintResources --account-address $DOJO_ACCOUNT_ADDRESS --calldata $entity_1_id,3,1000"
)

madara=false  # Default value
# Check if --madara option is present
if [[ " $* " =~ " --madara " ]]; then
  madara=true
fi

for cmd in "${commands[@]}"; do
    echo "Executing command: $cmd"
    output=$(eval "$cmd")
    echo "Output:"
    echo "$output"
    echo "--------------------------------------"

    if [ "$madara" = true ]; then
        echo "Sleeping for 6 seconds..."
        sleep 6
    fi
done
