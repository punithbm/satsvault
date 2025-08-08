# SatsVault

## Decentralised & Programmable BTC Vaults

SatsVault is a Bitcoin vault solution combining decentralized custody with programmable policies. Built on multi-party computation (MPC) technology and integrated with Porto.sh as the gateway for seamless wallet connectivity.

<img width="10102" height="3553" alt="screenshots" src="https://github.com/user-attachments/assets/673944e8-26ee-4c88-b096-fc360c61aab8" />

### 🔐 Key Features

- **Decentralized Custody**: MPC-based key management with no single point of failure
- **Porto.sh Integration**: Unified wallet gateway supporting multiple Bitcoin wallets
- **Programmable Policies**: Custom spending rules, time restrictions, and approval workflows
- **Smart Security**: Multi-signature approvals and conditional transaction policies
- **Native Bitcoin**: Direct Bitcoin transactions without wrapping or bridges

### 🏗️ Architecture

**Frontend (Next.js)**
- React components with Tailwind CSS
- Porto.sh SDK for wallet connectivity (Xverse, Unisat, etc.)
- Real-time updates via WebSocket
- Multi-wallet support through unified interface

**Backend (Node.js)**
- Multi-Party Computation (MPC) for distributed keys
- Bitcoin transaction monitoring and processing
- Policy enforcement engine
- Supabase database integration

**Porto.sh Gateway**
- Unified wallet connection interface
- Support for multiple Bitcoin wallets (Xverse, Unisat)
- PSBT signing and message authentication
- Cross-wallet compatibility layer

### 🚀 Quick Start

#### Prerequisites
- Node.js (v18+) & pnpm
- Bitcoin wallet (Xverse/Unisat)
- Porto.sh compatible environment

### 💡 Core Features

#### Multi-Party Computation
- Distributed key generation and signing
- Enhanced security through cryptographic protocols

#### Programmable Policies
- **Spending Limits**: Daily/monthly caps
- **Time Windows**: Scheduled transactions
- **Whitelists**: Approved recipients
- **Multi-Approval**: Multiple confirmation requirements

#### Porto.sh Benefits
- **Unified Interface**: Single SDK for multiple wallets
- **Enhanced UX**: Consistent user experience across wallets
- **Secure Gateway**: Standardized authentication and signing
- **Wallet Agnostic**: Support for current and future Bitcoin wallets

### 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

### 🔗 Links

- [Website](https://satsvault.com)
- [Documentation](https://docs.satsvault.com)
- [Discord Community](https://discord.gg/satsvault)

---

**Building the future of Bitcoin custody with decentralization and programmability.**
