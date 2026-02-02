# Arc Multichain Wallet

This sample app demonstrates how developers can build the best USDC interoperability UX for wallets using Arc and Gateway.

## Prerequisites

### Clone the Repository

```bash
git clone https://github.com/circlefin/arc-multichain-wallet.git
cd arc-multichain-wallet
```

### Install Dependencies

This project uses **npm** as the package manager. Make sure you have Node.js 18+ installed.

```bash
npm install
```

### Configure Environment Variables

```bash
cp .env.example .env
```

Update `.env` with your credentials:

```ini
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key

# Circle
CIRCLE_API_KEY=your-circle-api-key
CIRCLE_ENTITY_SECRET=your-circle-entity-secret
```

### Set Up Supabase (Local)

This project uses **local Supabase** via Docker for development:

```bash
# Start local Supabase (requires Docker)
npx supabase start

# Push database migrations
npx supabase db push
```

**Note:** If you prefer cloud-hosted Supabase, you can use:
```bash
npx supabase link
npx supabase db push
```

### Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000/wallet](http://localhost:3000/wallet)

## How It Works

### Unified Balance

When you deposit USDC to the Gateway Wallet, it becomes part of your unified balance accessible from any supported chain. The Gateway Wallet uses the same address on all chains: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`

### Deposit Flow

1. Approve Gateway Wallet to spend your USDC
2. Call `deposit()` to transfer USDC to Gateway
3. Balance becomes available across all chains after finalization

### Cross-Chain Transfer Flow

1. Create and sign burn intent (EIP-712)
2. Submit to Gateway API for attestation
3. Call `gatewayMint()` on destination chain
4. USDC minted on destination

## Security Notes

- This is a **testnet demonstration** only
- Private keys are processed server-side and never stored
- Never use mainnet private keys with this application
- Always use HTTPS in production
- Consider hardware wallet integration for production use

## Getting Testnet USDC

To test the application, you'll need testnet USDC on the supported chains. Use the Circle Faucet to get free testnet tokens:

### Using the Circle Faucet

1. **Get Your Wallet Address**: After signing up, your Circle Wallet addresses will be displayed in the dashboard
2. **Visit the Faucet**: Go to [https://faucet.circle.com/](https://faucet.circle.com/)
3. **Request Tokens**: 
   - Enter your wallet address
   - Select the desired testnet (Arc Testnet, Base Sepolia, or Avalanche Fuji)
   - Request USDC
4. **Wait for Confirmation**: Transactions typically confirm within a few minutes
5. **Deposit to Gateway**: Once received, use the "Deposit" tab to add USDC to your Gateway balance

### Supported Testnets

- **Arc Testnet**: Primary chain for deposits and Gateway operations
- **Base Sepolia**: Ethereum Layer 2 testnet
- **Avalanche Fuji**: Avalanche testnet

### Note on Gas Fees

When transferring USDC cross-chain, you'll need native tokens on the destination chain to pay for gas fees:
- **Arc Testnet**: USDC (no additional gas token needed)
- **Base Sepolia**: ETH (get from [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia))
- **Avalanche Fuji**: AVAX (get from [Avalanche Faucet](https://core.app/tools/testnet-faucet/))

## Resources

- [Circle Gateway Documentation](https://developers.circle.com/gateway)
- [Unified Balance Guide](https://developers.circle.com/gateway/howtos/create-unified-usdc-balance)
- [Circle Faucet](https://faucet.circle.com/)
