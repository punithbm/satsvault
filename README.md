# SatsVault

## Decentralised & Programmable BTC Vaults

SatsVault is a cutting-edge Bitcoin vault solution that combines the security of decentralized custody with the flexibility of programmable policies. Built on multi-party computation (MPC) technology, SatsVault enables users to store, manage, and transact Bitcoin with enhanced security and customizable rules.

### 🔐 Key Features

- **Decentralized Custody**: No single point of failure with MPC-based key management
- **Programmable Policies**: Set custom spending rules, time restrictions, and approval workflows
- **Smart Security**: Multi-signature approvals and conditional transaction policies
- **User-Friendly Interface**: Intuitive web interface for vault management
- **Bitcoin Native**: Direct Bitcoin transactions without wrapping or bridges

### 🏗️ Architecture

**Frontend**
- Next.js application with React components
- Tailwind CSS for responsive design
- Real-time updates via WebSocket connections
- Wallet integration for seamless Bitcoin operations

**Backend**
- Node.js with TypeScript
- Multi-Party Computation (MPC) for distributed key generation
- Bitcoin transaction handling and monitoring
- Policy enforcement engine
- Supabase database integration

### 🚀 Getting Started

#### Prerequisites
- Node.js (v18 or higher)
- pnpm package manager
- Bitcoin testnet/mainnet access

### 💡 Core Concepts

#### Multi-Party Computation (MPC)
- Distributed key generation and signing
- No single party controls private keys
- Enhanced security through cryptographic protocols

#### Programmable Policies
- **Spending Limits**: Daily/monthly transaction limits
- **Time Restrictions**: Transaction time windows
- **Recipient Whitelists**: Approved destination addresses
- **Multi-Approval**: Require multiple confirmations

#### Vault Operations
- **Deposit**: Secure Bitcoin deposits to vault addresses
- **Withdraw**: Policy-governed Bitcoin withdrawals
- **Transfer**: Internal vault-to-vault transfers

### 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

### 🔗 Links

- [Website](https://satsvault.com)
- [Documentation](https://docs.satsvault.com)
- [Discord Community](https://discord.gg/satsvault)

---

**Building the future of Bitcoin custody with decentralization and programmability.**
