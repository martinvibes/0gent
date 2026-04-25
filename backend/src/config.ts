import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  nodeEnv: optional("NODE_ENV", "development"),

  // 0G Chain
  zgRpcUrl: optional("ZG_RPC_URL", "https://evmrpc-testnet.0g.ai"),
  zgChainId: parseInt(optional("ZG_CHAIN_ID", "16602"), 10),
  deployerPrivateKey: optional("DEPLOYER_PRIVATE_KEY", ""),
  paymentContractAddress: optional("PAYMENT_CONTRACT_ADDRESS", ""),
  registryContractAddress: optional("REGISTRY_CONTRACT_ADDRESS", ""),
  identityContractAddress: optional("IDENTITY_CONTRACT_ADDRESS", ""),

  // 0G Storage
  zgStorageIndexerUrl: optional("ZG_STORAGE_INDEXER_URL", "https://indexer-storage-turbo.0g.ai"),
  zgStorageFlowContract: optional("ZG_STORAGE_FLOW_CONTRACT", "0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526"),

  // Telnyx
  telnyxApiKey: optional("TELNYX_API_KEY", ""),
  telnyxMessagingProfileId: optional("TELNYX_MESSAGING_PROFILE_ID", ""),

  // Cloudflare (Email Routing — inbound)
  cloudflareApiToken: optional("CLOUDFLARE_API_TOKEN", ""),
  cloudflareZoneId: optional("CLOUDFLARE_ZONE_ID", ""),
  cloudflareInboundDestination: optional("CLOUDFLARE_INBOUND_DESTINATION", ""),
  emailDomain: optional("EMAIL_DOMAIN", "0gent.xyz"),
  emailWebhookSecret: optional("EMAIL_WEBHOOK_SECRET", ""),

  // Resend (outbound)
  resendApiKey: optional("RESEND_API_KEY", ""),
  resendFromName: optional("RESEND_FROM_NAME", "0GENT Agent"),

  // Hetzner (Compute)
  hcloudToken: optional("HCLOUD_TOKEN", ""),
  hcloudLocation: optional("HCLOUD_LOCATION", "fsn1"),

  // Namecheap (Domains)
  namecheapApiKey: optional("NAMECHEAP_API_KEY", ""),
  namecheapApiUser: optional("NAMECHEAP_API_USER", ""),

  // Pricing (in 0G tokens, human-readable)
  pricePhoneProvision: optional("PRICE_PHONE", "0.5"),
  priceSmsSend: optional("PRICE_SMS", "0.01"),
  priceEmailProvision: optional("PRICE_EMAIL", "0.2"),
  priceEmailSend: optional("PRICE_EMAIL_SEND", "0.08"),
  priceEmailRead: optional("PRICE_EMAIL_READ", "0.02"),
  priceComputeProvision: optional("PRICE_COMPUTE", "1.0"),
  priceDomainRegister: optional("PRICE_DOMAIN", "2.0"),
  priceIdentityMint: optional("PRICE_IDENTITY_MINT", "0.1"),
} as const;
