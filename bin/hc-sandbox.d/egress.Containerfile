FROM docker.io/library/alpine:3.20
RUN apk add --no-cache nftables
COPY egress.nft egress-start.sh run.nft /etc/hc-sandbox/
ENTRYPOINT ["/etc/hc-sandbox/egress-start.sh"]
