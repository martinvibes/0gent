import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config";
import path from "path";
import healthRouter from "./routes/health";
import phoneRouter from "./routes/phone";
import emailRouter from "./routes/email";
import computeRouter from "./routes/compute";
import domainRouter from "./routes/domain";
import identityRouter from "./routes/identity";
import memoryRouter from "./routes/memory";
import pricingRouter from "./routes/pricing";
import walletRouter from "./routes/wallet";
import agentRouter from "./routes/agent";

const app = express();

// CORS — agents and the landing page should be able to call us from anywhere.
// Security still enforced via x402 payments + on-chain ownership, not origin.
app.use(
  cors({
    origin: true, // reflect request origin
    credentials: false,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Payment", "Payment-Signature", "X-0GENT-Webhook-Secret"],
    exposedHeaders: ["X-Payment", "Payment-Required"],
  })
);

// Helmet but with CSP relaxed enough to serve skill.md + JSON cleanly
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(express.json({ limit: "100kb" }));

// Serve skill.md from <backend>/public/ (bundled with the deploy)
app.use(express.static(path.join(__dirname, "..", "public")));

// Routes
app.use("/health", healthRouter);
app.use("/pricing", pricingRouter);
app.use("/phone", phoneRouter);
app.use("/email", emailRouter);
app.use("/compute", computeRouter);
app.use("/domain", domainRouter);
app.use("/identity", identityRouter);
app.use("/memory", memoryRouter);
app.use("/wallet", walletRouter);
app.use("/agent", agentRouter);

// Root → quick info
app.get("/", (_req, res) => {
  res.json({
    name: "0GENT API",
    version: "0.1.0",
    description: "Decentralized infrastructure for autonomous AI agents on 0G Chain",
    docs: "/skill.md",
    health: "/health",
    pricing: "/pricing",
    chain: `0G Chain (${config.zgChainId})`,
  });
});

app.listen(config.port, () => {
  console.log(`\n  0GENT API running on port ${config.port}`);
  console.log(`  Chain: 0G (${config.zgChainId}) via ${config.zgRpcUrl}`);
  console.log(`  Storage: ${config.zgStorageIndexerUrl}\n`);
});

export { app };
