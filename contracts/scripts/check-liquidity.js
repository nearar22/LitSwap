const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const deployments = JSON.parse(fs.readFileSync("./deployments.json", "utf8"));
  const [signer] = await hre.ethers.getSigners();
  const me = signer.address;

  console.log("Checking on-chain state for:", me);
  console.log("Factory:", deployments.LitSwapFactory);

  const factory = await hre.ethers.getContractAt("LitSwapFactory", deployments.LitSwapFactory);
  const totalPairs = await factory.allPairsLength();
  console.log(`\nTotal pairs in factory: ${totalPairs}\n`);

  for (let i = 0; i < Number(totalPairs); i++) {
    const pairAddr = await factory.allPairs(i);
    const pair = await hre.ethers.getContractAt("LitSwapPair", pairAddr);

    const token0 = await pair.token0();
    const token1 = await pair.token1();
    const reserves = await pair.getReserves();
    const totalSupply = await pair.totalSupply();
    const myBalance = await pair.balanceOf(me);

    const sym0 = Object.entries(deployments.tokens).find(([, addr]) => addr.toLowerCase() === token0.toLowerCase())?.[0]
              || (token0.toLowerCase() === deployments.WLTC.toLowerCase() ? "WLTC" : token0);
    const sym1 = Object.entries(deployments.tokens).find(([, addr]) => addr.toLowerCase() === token1.toLowerCase())?.[0]
              || (token1.toLowerCase() === deployments.WLTC.toLowerCase() ? "WLTC" : token1);

    console.log(`--- Pair ${i}: ${sym0} / ${sym1} ---`);
    console.log(`  Address:     ${pairAddr}`);
    console.log(`  Reserve0:    ${reserves[0].toString()}`);
    console.log(`  Reserve1:    ${reserves[1].toString()}`);
    console.log(`  Total LP:    ${totalSupply.toString()}`);
    console.log(`  Your LP:     ${myBalance.toString()}`);
    console.log();
  }

  console.log("=== Your token balances ===");
  for (const [sym, addr] of Object.entries(deployments.tokens)) {
    const token = await hre.ethers.getContractAt("MockERC20", addr);
    const bal = await token.balanceOf(me);
    const decimals = await token.decimals();
    console.log(`  ${sym.padEnd(5)} ${hre.ethers.formatUnits(bal, decimals)}`);
  }
  const nativeBal = await hre.ethers.provider.getBalance(me);
  console.log(`  zkLTC ${hre.ethers.formatEther(nativeBal)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
