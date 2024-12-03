// nonce
// authorize

// obtener la firma erc721
// validar la firma, debe contener el contenido y el nonce
// despues de validarla actualizar el nonce y finalmente conseceder el accesso
// se debe obtener el cid desde el vault y pasarlo a IPFS para hacer el proxy redirection 


import http2 from 'node:http'
import { HttpChain, HttpChainClient, fetchBeacon } from "drand-client";

import { keccak256, createPublicClient, http, parseAbi, hashMessage } from 'viem'
import { polygon, polygonAmoy } from 'viem/chains'

import express from 'express';
const app = express();

const time = Date.now()
const account = "0x61Cad4F0fd9F93482095b4882111f953e563b404";
const EIP1271_MAGIC_VALUE = '0x1626ba7e'

// Middleware de autorización
app.get('/auth', async (req, res) => {
    // console.log(req)
    // const signature = req.query.signature;
    // const assetId = 'bafkreigdrtkfjzyz4h3pkm2wexoxuprxvywuykkionwipulwkholttbqba' //req.query.assetId

    // // const nonce = 1;
    // const options = {
    //     disableBeaconVerification: true,
    //     noCache: false, // `true` disables caching when retrieving beacons for some providers
    // }

    // const publicClient = createPublicClient({
    //     chain: polygonAmoy,
    //     transport: http()
    // })

    // // TODO refine cuando se envia con un hash anterior
    // const chain = new HttpChain("https://api.drand.sh");
    // const client = new HttpChainClient(chain, options);
    // const beacon = await fetchBeacon(client);
    // const hashMsg = hashMessage(`${assetId}:${polygonAmoy.id}:${beacon.randomness}`);

    // const data = await publicClient.readContract({
    //     address: account, // smart account
    //     abi: parseAbi(["function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)"]),
    //     functionName: 'isValidSignature',
    //     args: [hashMsg, signature]
    // })


    // if (data != EIP1271_MAGIC_VALUE) {
    //     console.log("failed")
    //     return res.status(401).send('Unauthorized');
    // }

    // return res.status(403).send('Forbidden'); // Bloquear solicitud
    // http2.get(`http://127.0.0.1:8080/ipfs/${assetId}`, (res2) => {
    //     let bytes = ''
    //     res2.on('data', function (data) {
    //         bytes += data;

    //     });

    //     res2.on('end', () => {
    //         const metadata = JSON.parse(bytes)
    //         console.log(metadata.s.cid)
    console.log('setting')
    res.setHeader('X-Authorized-CID','bafybeiae7bdzba4znzzv4nrgz3ajho7nyqzun557bgc46temcckqvunq5e')
    res.sendStatus(200);
    //     })
    // })


    // return res.status(200).send('OK');


    // tiene acceso en el contrato?





    // verificamos que en efecto el signer firmo autorizando su propio account
    // https://eips.ethereum.org/EIPS/eip-712#definition-of-domainseparator[EIP-712]
    // const domainSep = keccak256(EIP_DOMAIN, name, version, polygonAmoy.id, account);
    // const structHash = keccak256(CONTENT_REQUEST_HASH, assetId, signature, 1);
    // const hash = keccak256("\x19\x01", domainSep, structHash);
    // const address = recoverAddress({ hash, signature })

});

// Puerto donde escucha el middleware
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Middleware Node.js corriendo en http://localhost:${PORT}`);
});
