#!/bin/sh
set -eu
nft -f /etc/hc-sandbox/egress.nft
for address in "$@"; do
  case "$address" in
    *:*) nft add element inet hc_sandbox host6 "{ $address }" ;;
    *) nft add element inet hc_sandbox host4 "{ $address }" ;;
  esac
done
touch /run/hc-sandbox-ready
exec sleep infinity
