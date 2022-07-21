import hdKey from "hdkey";
import crypto from "crypto";
import base58 from "bs58check";
import wif from "wif";
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

const seed = "73c873e9bb4e0260eec1989ac181d7faab249fef2db32f08c70910505185585c803a7da05bdbd31a107fbe10f7fdb4eec449075c9870e8adc23e8f607f894b9af3b9b5f11fb0f934f5a232ca09a40f23471321fc42f9b6f55ed4dfd22dd83cee64bd1589d722d6039df86dc8fc1964519550cb22ca993cd24342665cace0eb413dcc8a9cfa9ade08e23de05df4648684f5d6ea1e5bf07d9ed6c7b3d4daa9b606a00a085c0ad53b6c7ec2ea95c6dbcb6a9c9282f5d40f17fca661ae54a6420ca7aa46fd2107f081bc4ab59122da21e7a7ac39a6bb59d6c3f75a130986736c484581e4a2580040f529ba500e1262df88033840e209c4317cb42a4fd71690da23a5";
const hdWalletKeys = hdKey.fromMasterSeed(Buffer.from(seed, 'hex'))
const childKey = hdWalletKeys.derive("m/44'/0'/0'/0/0")
const hashing = crypto.createHmac('sha256',childKey.publicKey).digest()
const hashed = crypto.createHmac('sha256',hashing).digest()

var step4 = Buffer.allocUnsafe(21);
step4.writeUInt8(0x00, 0);
hashed.copy(step4, 1); 

const btcAddress = base58.encode(step4);
const privateKey = wif.encode(128,childKey.privateKey,true)
console.log('Base58Check: ' + btcAddress, "Private Key: " + privateKey);
const mn = bip39.generateMnemonic(wordlist);
console.log(bip39.entropyToMnemonic(childKey.privateKey, wordlist));

export default seed;
