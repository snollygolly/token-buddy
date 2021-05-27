const Web3 = require("web3");
const { hdkey } = require("ethereumjs-wallet");
const bip39 = require("bip39");
const abiDecoder = require("abi-decoder");

const erc20 = require("./erc20");
const exchange = require("./exchange");

let config = {};

module.exports = {
  init: async (data) => {
    if (!data) {
      throw new Error("You must provide initialization values");
    }
    if (typeof data.index !== "number") {
      throw new Error("No wallet index provided");
    }
    if (!data.provider) {
      throw new Error("No WS provider supplied");
    }
    if (!data.token) {
      throw new Error("No token JSON supplied");
    }
    if (!data.token.abi) {
      throw new Error("No token JSON ABI supplied");
    }
    if (!data.token.contract_address) {
      throw new Error("No token JSON contract address provided");
    }
    if (!data.mnemonic) {
      console.log("! token-helper init called with no mnemonic, creating one");
      data.mnemonic = bip39.generateMnemonic();
    }
    config = {
      mnemonic: data.mnemonic,
      index: data.index,
      token: data.token,
      exchangeFactoryAddress: data.exchangeFactoryAddress,
    };
    const seed = await bip39.mnemonicToSeed(config.mnemonic);
    config.root = hdkey.fromMasterSeed(seed);
    config.web3 = new Web3(data.provider);
  },
  newAccount: () => {
    // create a new address and advance the index one
    const addrNode = config.root.derivePath("m/44'/60'/0'/0/0");
    const wallet = addrNode.getWallet();
    config.wallet = wallet;
    const address = wallet.getAddressString();
    return address;
  },
  getBalance: async (address) => {
    const result = await config.web3.eth.getBalance(address);
    return result;
  },
  getTokenBalance: async (address) => {
    const contract = new config.web3.eth.Contract(
      config.token.abi,
      config.token.contract_address
    );
    const result = await contract.methods.balanceOf(address).call();
    return result;
  },
  sendTokens: async (fromAddress, toAddress, amount) => {
    const contract = new config.web3.eth.Contract(
      config.token.abi,
      config.token.contract_address,
      {
        from: fromAddress,
      }
    );
    const privateKey = `0x${config.wallet.privateKey.toString("hex")}`;
    const account = config.web3.eth.accounts.privateKeyToAccount(privateKey);
    config.web3.eth.accounts.wallet.create();
    config.web3.eth.accounts.wallet.add(account);
    // token has 3 decimal places, 1000 -> 1.000
    const estimatedGas = await contract.methods
      .transfer(toAddress, amount)
      .estimateGas();

    const result = await contract.methods.transfer(toAddress, amount).send({
      from: fromAddress,
      gas: estimatedGas,
      value: 0x0,
    });
    return result;
  },
  getTokenTransactions: async (blocks = 1000) => {
    const address = config.wallet.getAddressString().toLowerCase();

    const endBlockNumber = await config.web3.eth.getBlockNumber();
    const startBlockNumber = Math.max(endBlockNumber - blocks, 0);

    abiDecoder.addABI(config.token.abi);
    const results = [];
    for (let i = startBlockNumber; i <= endBlockNumber; i++) {
      const block = await config.web3.eth.getBlock(i, true);
      if (block != null && block.transactions != null) {
        for (const e of block.transactions) {
          const decoded = abiDecoder.decodeMethod(e.input);
          if (!decoded) {
            continue;
          }
          results.push({
            hash: e.hash,
            from: e.from,
            to: decoded.params[0].value,
            tokens: decoded.params[1].value,
            gas: e.gas,
          });
        }
      }
    }
    return results;
  },
  getExchangeRate: async (baseAddress, quoteAddress) => {
    const factoryContract = new config.web3.eth.Contract(
      exchange.factory_abi,
      config.exchangeFactoryAddress
    );

    const quoteContract = await new config.web3.eth.Contract(
      erc20.abi,
      quoteAddress
    );
    const quoteDecimals = await quoteContract.methods.decimals().call();

    const baseContract = await new config.web3.eth.Contract(
      erc20.abi,
      baseAddress
    );
    const baseDecimals = await baseContract.methods.decimals().call();

    const pairAddress = await factoryContract.methods
      .getPair(baseAddress, quoteAddress)
      .call();

    const pairContract = new config.web3.eth.Contract(
      exchange.pair_abi,
      pairAddress
    );

    const reserves = await pairContract.methods.getReserves().call();

    const res0 = reserves._reserve0 * 10 ** quoteDecimals;
    const res1 = reserves._reserve1 * 10 ** baseDecimals;

    const price = res1 / res0;

    return price;
  },
};
