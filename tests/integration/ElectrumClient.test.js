import assert from 'assert';
import * as bitcoin from '@doichain/doichainjs-lib';
import ElectrumClient from 'electrum-client';

import { DOICHAIN } from '../../blue_modules/network.js';

const net = require('net');
const tls = require('tls');

jest.setTimeout(150 * 1000);

/**
 * The servers the wallet ships with. This used to point at electrum1-3.bluewallet.io, which answer
 * for Bitcoin and refuse the connection from here, so the test could only ever fail.
 */
const hardcodedPeers = [
  { host: 'itchy-jellyfish-89.doi.works', ssl: 50002 },
  { host: 'big-parrot-60.doi.works', ssl: 50002 },
  { host: 'ugly-bird-70.doi.works', ssl: 50002 },
];

/** The holder of the name "doichain", picked only because it is a Doichain address that exists. */
const SOME_ADDRESS = 'NEYSLcFT6ajS2gLYCKhZ97shUj5kveoM6P';

const scripthashOf = address => {
  const script = bitcoin.address.toOutputScript(address, DOICHAIN);
  const hash = bitcoin.crypto.sha256(script);
  return Buffer.from(hash).reverse().toString('hex');
};

describe('ElectrumClient', () => {
  it('can connect and query every server the wallet ships with', async () => {
    for (const peer of hardcodedPeers) {
      const mainClient = new ElectrumClient(net, tls, peer.ssl, peer.host, 'tls');

      try {
        await mainClient.connect();
        const version = await mainClient.server_version('2.7.11', '1.4');
        assert.ok(Array.isArray(version) && version[0], `${peer.host} did not say what it is`);

        // What the server answers has to have the shape the wallet reads, which is the point of
        // this test. The amounts themselves are nobody's business and change on their own - half
        // of this suite fails because it compares against balances recorded years ago.
        const balance = await mainClient.blockchainScripthash_getBalance(scripthashOf(SOME_ADDRESS));
        assert.strictEqual(typeof balance.confirmed, 'number', `${peer.host} returned no confirmed balance`);
        assert.strictEqual(typeof balance.unconfirmed, 'number', `${peer.host} returned no unconfirmed balance`);

        const header = await mainClient.blockchainHeaders_subscribe();
        assert.ok(header.height > 0, `${peer.host} is at height ${header.height}`);
      } catch (e) {
        mainClient.reconnect = mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
        mainClient.close();
        throw new Error('bad connection: ' + JSON.stringify(peer) + ' ' + e.message);
      }

      mainClient.close();
    }
  });
});
