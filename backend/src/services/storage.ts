import { Indexer, ZgFile } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import { config } from "../config";
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const TEMP_DIR = join(process.cwd(), "data", "tmp");
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

let _indexer: Indexer | null = null;

function getIndexer(): Indexer {
  if (!_indexer) {
    _indexer = new Indexer(config.zgStorageIndexerUrl);
  }
  return _indexer;
}

function getSigner(): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(config.zgRpcUrl);
  return new ethers.Wallet(config.deployerPrivateKey, provider);
}

export async function uploadJson(key: string, data: Record<string, unknown>): Promise<string> {
  const content = JSON.stringify(data);
  const tempPath = join(TEMP_DIR, `${key}-${Date.now()}.json`);

  try {
    writeFileSync(tempPath, content);
    const file = await ZgFile.fromFilePath(tempPath);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr || !tree) throw new Error(`Merkle tree error: ${treeErr}`);

    const rootHash: string = tree.rootHash() ?? "";
    const indexer = getIndexer();
    const [, uploadErr] = await indexer.upload(file, config.zgRpcUrl, getSigner());
    if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

    await file.close();
    return rootHash;
  } finally {
    try { unlinkSync(tempPath); } catch {}
  }
}

export async function downloadByHash(rootHash: string): Promise<Buffer> {
  const tempPath = join(TEMP_DIR, `download-${Date.now()}.bin`);
  try {
    const indexer = getIndexer();
    const err = await indexer.download(rootHash, tempPath, true);
    if (err) throw new Error(`Download error: ${err}`);
    return readFileSync(tempPath);
  } finally {
    try { unlinkSync(tempPath); } catch {}
  }
}

export async function uploadAgentMetadata(
  agentAddress: string,
  name: string,
  createdAt: string
): Promise<string> {
  return uploadJson(`identity-${agentAddress}`, {
    name: name || `Agent ${agentAddress.slice(0, 8)}`,
    description: "0GENT Agent Identity",
    agent: agentAddress,
    createdAt,
    platform: "0GENT",
    chain: "0G",
  });
}

export async function uploadMemory(
  agentAddress: string,
  key: string,
  value: unknown
): Promise<string> {
  return uploadJson(`memory-${agentAddress}-${key}`, {
    agent: agentAddress,
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}
