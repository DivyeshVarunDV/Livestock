import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as grpc from "@grpc/grpc-js";
import { connect, Contract, Identity, Signer, signers } from "@hyperledger/fabric-gateway";

export const FABRIC_CHANNEL_NAME = process.env.FABRIC_CHANNEL_NAME || "mychannel";
export const FABRIC_CHAINCODE_NAME = process.env.FABRIC_CHAINCODE_NAME || "livestock";
export const FABRIC_MSP_ID = process.env.FABRIC_MSP_ID || "Org1MSP";
export const FABRIC_PEER_ENDPOINT = process.env.FABRIC_PEER_ENDPOINT || "localhost:7051";
export const FABRIC_PEER_HOST_ALIAS = process.env.FABRIC_PEER_HOST_ALIAS || "peer0.org1.example.com";

const cryptoPath = process.env.FABRIC_CRYPTO_PATH || path.resolve(__dirname, "..", "..", "..", "..", "fabric-samples", "test-network", "organizations", "peerOrganizations", "org1.example.com");

export async function createFabricConnection() {
  const certPath = path.join(cryptoPath, "users", "User1@org1.example.com", "msp", "signcerts", "cert.pem");
  const keyDirectoryPath = path.join(cryptoPath, "users", "User1@org1.example.com", "msp", "keystore");
  const tlsCertPath = path.join(cryptoPath, "peers", "peer0.org1.example.com", "tls", "ca.crt");

  const credentials = await fs.promises.readFile(certPath);
  const identity: Identity = { mspId: FABRIC_MSP_ID, credentials };

  const keyFiles = await fs.promises.readdir(keyDirectoryPath);
  const keyPath = path.join(keyDirectoryPath, keyFiles[0]);
  const privateKeyPem = await fs.promises.readFile(keyPath);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signer: Signer = signers.newPrivateKeySigner(privateKey);

  const tlsRootCert = await fs.promises.readFile(tlsCertPath);
  const client = new grpc.Client(FABRIC_PEER_ENDPOINT, grpc.credentials.createSsl(tlsRootCert), {
    "grpc.ssl_target_name_override": FABRIC_PEER_HOST_ALIAS,
  });

  return connect({
    client,
    identity,
    signer,
    evaluateOptions: () => {
      return { deadline: Date.now() + 5000 };
    },
    endorseOptions: () => {
      return { deadline: Date.now() + 15000 };
    },
    submitOptions: () => {
      return { deadline: Date.now() + 5000 };
    },
    commitStatusOptions: () => {
      return { deadline: Date.now() + 60000 };
    },
  });
}
