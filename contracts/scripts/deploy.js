const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying LitSwap contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "zkLTC");

  // 1. Deploy WLTC
  console.log("\n[1/5] Deploying WLTC...");
  const WLTC = await ethers.deployContract("WLTC");
  await WLTC.waitForDeployment();
  console.log("WLTC deployed to:", await WLTC.getAddress());

  // 2. Deploy Factory
  console.log("\n[2/5] Deploying LitSwapFactory...");
  const Factory = await ethers.deployContract("LitSwapFactory", [deployer.address]);
  await Factory.waitForDeployment();
  console.log("LitSwapFactory deployed to:", await Factory.getAddress());

  // 3. Deploy Router
  console.log("\n[3/5] Deploying LitSwapRouter...");
  const Router = await ethers.deployContract("LitSwapRouter", [
    await Factory.getAddress(),
    await WLTC.getAddress(),
  ]);
  await Router.waitForDeployment();
  console.log("LitSwapRouter deployed to:", await Router.getAddress());

  // 4. Deploy mock tokens for testnet
  console.log("\n[4/5] Deploying 5 mock tokens for testnet...");
  const TOKENS_TO_DEPLOY = [
    { name: "USD Coin",        symbol: "USDC", decimals: 6,  supply: "1000000" },
    { name: "Tether USD",      symbol: "USDT", decimals: 6,  supply: "1000000" },
    { name: "Wrapped Bitcoin", symbol: "WBTC", decimals: 8,  supply: "100"     },
    { name: "Dai Stablecoin",  symbol: "DAI",  decimals: 18, supply: "1000000" },
    { name: "Wrapped Ether",   symbol: "WETH", decimals: 18, supply: "1000"    },
  ];

  const deployedTokens = {};
  for (const t of TOKENS_TO_DEPLOY) {
    const contract = await ethers.deployContract("MockERC20", [t.name, t.symbol, t.decimals]);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    deployedTokens[t.symbol] = { address: addr, contract, ...t };
    console.log(`  ${t.symbol.padEnd(5)} deployed to: ${addr}`);
  }

  // 5. Mint initial supply to deployer
  console.log("\n[5/5] Minting initial supply for each token...");
  for (const symbol of Object.keys(deployedTokens)) {
    const t = deployedTokens[symbol];
    const amount = ethers.parseUnits(t.supply, t.decimals);
    await (await t.contract.mint(deployer.address, amount)).wait();
    console.log(`  Minted ${t.supply} ${symbol} to deployer`);
  }

  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("Network: LitVM LiteForge Testnet (Chain ID: 4441)");
  console.log("=========================================");
  console.log(`WLTC:            ${await WLTC.getAddress()}`);
  console.log(`LitSwapFactory:  ${await Factory.getAddress()}`);
  console.log(`LitSwapRouter:   ${await Router.getAddress()}`);
  for (const symbol of Object.keys(deployedTokens)) {
    console.log(`${symbol.padEnd(16)} ${deployedTokens[symbol].address}`);
  }
  console.log("=========================================");

  // Save addresses to a file for the frontend
  const fs = require("fs");
  const tokenAddresses = {};
  for (const symbol of Object.keys(deployedTokens)) {
    tokenAddresses[symbol] = deployedTokens[symbol].address;
  }
  const addresses = {
    network: "litvm_testnet",
    chainId: 4441,
    WLTC: await WLTC.getAddress(),
    LitSwapFactory: await Factory.getAddress(),
    LitSwapRouter: await Router.getAddress(),
    tokens: tokenAddresses,
  };

  fs.writeFileSync("./deployments.json", JSON.stringify(addresses, null, 2));
  console.log("\nDeployment addresses saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
