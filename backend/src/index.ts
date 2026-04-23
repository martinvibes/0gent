import express from "express";
import helmet from "helmet";
import { config } from "./config";
import path from "path";
import healthRouter from "./routes/health";
import phoneRouter from "./routes/phone";
import emailRouter from "./routes/email";
import computeRouter from "./routes/compute";
import domainRouter from "./routes/domain";
import identityRouter from "./routes/identity";
import memoryRouter from "./routes/memory";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "100kb" }));

// Serve skill.md and static files
app.use(express.static(path.join(__dirname, "../../public")));

// Routes
app.use("/health", healthRouter);
app.use("/phone", phoneRouter);
app.use("/email", emailRouter);
app.use("/compute", computeRouter);
app.use("/domain", domainRouter);
app.use("/identity", identityRouter);
app.use("/memory", memoryRouter);

app.listen(config.port, () => {
  console.log(`\n  0GENT API running on port ${config.port}`);
  console.log(`  Chain: 0G (${config.zgChainId}) via ${config.zgRpcUrl}`);
  console.log(`  Storage: ${config.zgStorageIndexerUrl}\n`);
});

export { app };
