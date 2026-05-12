import type { Address } from "viem";

export const LITVM_CHAIN_ID = 4441;

export const CONTRACTS = {
  FACTORY: "0x52d776DE1251a81ACEd1b367514b2cC27529d6a1" as Address,
  ROUTER: "0xF60b47196C74AA590bb7D97ADf4B9e7813f38565" as Address,
  WLTC: "0x9E290b93bbF5C84eb73b78474F6e840bBFaBc609" as Address,
};

export type Token = {
  address: Address | "native";
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  isNative?: boolean;
};

export const TOKENS: Token[] = [
  {
    address: "native",
    symbol: "zkLTC",
    name: "LitVM Native LTC",
    decimals: 18,
    isNative: true,
  },
  {
    address: CONTRACTS.WLTC,
    symbol: "WLTC",
    name: "Wrapped Litecoin",
    decimals: 18,
  },
  {
    address: "0x023E80b1e0270E66cC8D37D9E445980ed465A4E4",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  {
    address: "0x6e694457da53f08393E7bB742e23189CB8e24735",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
  {
    address: "0x38BbeA98ee2174D4a64f4E258D5CC4B3A6C68968",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
  },
  {
    address: "0x5657401d6361F451713c16112E077734070ac741",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
  },
  {
    address: "0x9f6fBD4B586f39Fcfd5043E3Aa82949d93e84C60",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
  },
];

export const tokenForAddress = (addr: Address | "native") =>
  TOKENS.find((t) => t.address.toLowerCase() === String(addr).toLowerCase());

/** Address used for routing; native maps to WLTC for paths. */
export const wrappedAddress = (t: Token): Address =>
  t.isNative ? CONTRACTS.WLTC : (t.address as Address);
