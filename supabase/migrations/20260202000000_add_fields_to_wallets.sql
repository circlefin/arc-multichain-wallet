-- Add new columns to wallets table to support EOA wallets and multi-wallet support
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS blockchain TEXT;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.wallets.address IS 'The wallet address (e.g., 0x...)';
COMMENT ON COLUMN public.wallets.blockchain IS 'The blockchain identifier (e.g., ARC-TESTNET, BASE-SEPOLIA, AVAX-FUJI)';
COMMENT ON COLUMN public.wallets.type IS 'The type of wallet (sca, gateway_signer)';
COMMENT ON COLUMN public.wallets.name IS 'A human-readable name for the wallet';
