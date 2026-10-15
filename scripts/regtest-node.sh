#!/bin/bash
#
# Runs a throwaway Doichain Core regtest node for the tests in tests/regtest/.
#
# Name operations cannot be tested against mainnet or a mocked server: what matters is whether
# Doichain Core accepts a transaction, and only a real node can answer that. See
# Doichain/DoiWallet#36 for what went unnoticed without it.
#
# Usage:
#   ./scripts/regtest-node.sh start     download (once), start the node, mine spendable coins
#   ./scripts/regtest-node.sh stop      stop the node, keep the chain
#   ./scripts/regtest-node.sh reset     stop and delete the chain, keeping the binaries
#   ./scripts/regtest-node.sh status    is it up, and at which height
#   ./scripts/regtest-node.sh cli ...   pass anything through to doichain-cli
#
# The node lives entirely under $DOICHAIN_REGTEST_DIR (default .regtest/ in the project) and never
# touches ~/.doichain, so an existing mainnet node and its wallets are left alone.

set -euo pipefail

VERSION="v31.1.6"
RPC_PORT=19443
RPC_USER=rt
RPC_PASSWORD=rt
REGTEST_DIR="${DOICHAIN_REGTEST_DIR:-$(cd "$(dirname "$0")/.." && pwd)/.regtest}"
BIN_DIR="$REGTEST_DIR/bin"
DATA_DIR="$REGTEST_DIR/data"
BASE_URL="https://github.com/Doichain/doichain-core/releases/download/$VERSION"

cli() {
  "$BIN_DIR/doichain-cli" -datadir="$DATA_DIR" -rpcport=$RPC_PORT -rpcuser=$RPC_USER -rpcpassword=$RPC_PASSWORD "$@"
}

download() {
  [ -x "$BIN_DIR/doichaind" ] && [ -x "$BIN_DIR/doichain-cli" ] && return 0

  echo "downloading Doichain Core $VERSION..."
  mkdir -p "$BIN_DIR"
  for name in doichaind doichain-cli; do
    curl -sL "$BASE_URL/$name-$VERSION-x86_64-linux-static" -o "$BIN_DIR/$name-$VERSION-x86_64-linux-static"
  done
  curl -sL "$BASE_URL/SHA256SUMS" -o "$BIN_DIR/SHA256SUMS"

  # the release is only trustworthy if the checksums match
  ( cd "$BIN_DIR" && grep -E "(doichaind|doichain-cli)-$VERSION-x86_64-linux-static" SHA256SUMS | sha256sum --check --strict )

  for name in doichaind doichain-cli; do
    mv "$BIN_DIR/$name-$VERSION-x86_64-linux-static" "$BIN_DIR/$name"
    chmod +x "$BIN_DIR/$name"
  done
  echo "checksums verified"
}

write_conf() {
  mkdir -p "$DATA_DIR"
  cat > "$DATA_DIR/doichain.conf" <<EOF
regtest=1
server=1
listen=0
txindex=1
fallbackfee=0.0001
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
[regtest]
rpcport=$RPC_PORT
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
EOF
}

wait_for_rpc() {
  for _ in $(seq 1 60); do
    cli getblockchaininfo >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "node did not answer on port $RPC_PORT" >&2
  return 1
}

case "${1:-}" in
  start)
    download
    write_conf
    if cli getblockchaininfo >/dev/null 2>&1; then
      echo "already running"
    else
      "$BIN_DIR/doichaind" -datadir="$DATA_DIR" -daemon >/dev/null
      wait_for_rpc
    fi

    # a restart leaves the wallet on disk but unloaded, so try loading before creating
    cli loadwallet test >/dev/null 2>&1 || cli createwallet test >/dev/null 2>&1 || true

    # coinbase outputs need 100 confirmations, so 150 blocks leave plenty to spend
    if [ "$(cli getblockcount)" -lt 150 ]; then
      echo "mining 150 blocks..."
      cli generatetoaddress 150 "$(cli getnewaddress '' legacy)" >/dev/null
    fi

    echo "regtest node up: height $(cli getblockcount), balance $(cli getbalance) DOI, rpc 127.0.0.1:$RPC_PORT"
    echo "run the tests with: npm run regtest"
    ;;

  stop)
    cli stop 2>/dev/null || echo "not running"
    ;;

  reset)
    cli stop 2>/dev/null || true
    sleep 2
    rm -rf "$DATA_DIR"
    echo "chain deleted, binaries kept"
    ;;

  status)
    if cli getblockchaininfo >/dev/null 2>&1; then
      echo "up: chain $(cli getblockchaininfo | grep -o '"chain": *"[^"]*"' | cut -d'"' -f4), height $(cli getblockcount)"
    else
      echo "down"
    fi
    ;;

  cli)
    shift
    cli "$@"
    ;;

  *)
    sed -n '3,19p' "$0" | sed 's|^# *||'
    exit 1
    ;;
esac
