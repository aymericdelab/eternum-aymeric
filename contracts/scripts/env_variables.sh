madara=false  # Default value
# Check if --madara option is present
if [[ " $* " =~ " --madara " ]]; then
  madara=true
fi

if [ "$madara" = true ]; then
    # madara
    export DOJO_ACCOUNT_ADDRESS="0x2"
    export DOJO_PRIVATE_KEY="0xc1cf1490de1352865301bb8705143f3ef938f97fdf892f1090dcb5ac7bcd1d"
    else
    # katana
    export DOJO_ACCOUNT_ADDRESS="0x03ee9e18edc71a6df30ac3aca2e0b02a198fbce19b7480a63a0d71cbd76652e0"
    export DOJO_PRIVATE_KEY="0x0300001800000000300000180000000000030000000000003006001800006600"
fi

export SOZO_WORLD="0x26065106fa319c3981618e7567480a50132f23932226a51c219ffb8e47daa84"
export STARKNET_RPC_URL="http://localhost:5050"