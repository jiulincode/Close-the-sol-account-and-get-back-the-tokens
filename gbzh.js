const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { burn, closeAccount } = require('@solana/spl-token');
const bs58 = require('bs58').default;

// 使用你的RPC URL
const connection = new Connection('');

const wallet = Keypair.fromSecretKey(bs58.decode(''));

async function main() {
    console.log(`Checking token accounts for wallet: ${wallet.publicKey.toBase58()}`);
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") });
    
    for (let accountInfo of tokenAccounts.value) {
        let tokenAccountPubkey = accountInfo.pubkey;
        let tokenAmount = accountInfo.account.data.parsed.info.tokenAmount.uiAmount;
        let decimals = accountInfo.account.data.parsed.info.tokenAmount.decimals;

        console.log(`Token account ${tokenAccountPubkey} has balance: ${tokenAmount}`);

        try {
            const mint = new PublicKey(accountInfo.account.data.parsed.info.mint);

            if (tokenAmount === 0) {
                // 如果账户余额等于0，直接关闭账户
                console.log(`Closing token account ${tokenAccountPubkey} with balance 0...`);
                await closeAccount(connection, wallet, tokenAccountPubkey, wallet.publicKey, wallet);
                console.log(`Successfully closed token account ${tokenAccountPubkey}`);
            } else if (tokenAmount > 0 && tokenAmount < 3) {
                // 如果账户余额大于0小于3，先燃烧再关闭账户
                console.log(`Burning ${tokenAmount} tokens from ${tokenAccountPubkey}...`);
                await burn(connection, wallet, tokenAccountPubkey, mint, wallet, tokenAmount * Math.pow(10, decimals));
                
                console.log(`Closing token account ${tokenAccountPubkey} after burning...`);
                await closeAccount(connection, wallet, tokenAccountPubkey, wallet.publicKey, wallet);
                console.log(`Successfully closed token account ${tokenAccountPubkey}`);
            }
        } catch (error) {
            console.error(`Failed to burn and close token account ${tokenAccountPubkey}:`, error.message);
        }
    }
}

// 设置每30分钟运行一次
setInterval(main, 30 * 60 * 1000);

// 立即执行一次
main().catch(err => {
    console.error(err);
});
