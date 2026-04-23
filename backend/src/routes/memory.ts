import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/x402";
import { uploadMemory, downloadByHash } from "../services/storage";
import { db } from "../db";

const router = Router();

router.post("/:address", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = req.params.address;
    const key = String(req.body.key || "");
    const value = req.body.value;
    if (!key) { res.status(400).json({ error: "key field required" }); return; }

    const rootHash = await uploadMemory(String(agent), key, value);

    db.prepare(
      "INSERT OR REPLACE INTO memory_index (agent, key, root_hash, updated_at) VALUES (?, ?, ?, ?)"
    ).run(agent, key, rootHash, new Date().toISOString());

    res.json({ agent, key, rootHash, message: "Memory stored on 0G Storage" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:address", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = req.params.address;
    const key = req.query.key as string;

    if (key) {
      const row = db.prepare("SELECT * FROM memory_index WHERE agent = ? AND key = ?").get(agent, key) as any;
      if (!row) { res.status(404).json({ error: "Memory key not found" }); return; }

      const data = await downloadByHash(row.root_hash);
      res.json({ agent, key, value: JSON.parse(data.toString()), rootHash: row.root_hash });
    } else {
      const rows = db.prepare("SELECT key, root_hash, updated_at FROM memory_index WHERE agent = ?").all(agent);
      res.json({ agent, keys: rows });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:address/key/:key", async (req: AuthenticatedRequest, res: Response) => {
  try {
    db.prepare("DELETE FROM memory_index WHERE agent = ? AND key = ?").run(req.params.address, req.params.key);
    res.json({ message: "Memory key deleted from index" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
