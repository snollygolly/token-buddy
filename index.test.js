const bip39 = require("bip39");
const Web3 = require("web3");
const { hdkey } = require("ethereumjs-wallet");

const { init, newAccount, getBalance, getTokenBalance, sendTokens } = require("./index");

jest.mock("bip39", () => ({
  generateMnemonic: jest.fn(),
  mnemonicToSeed: jest.fn(),
}));

jest.mock("ethereumjs-wallet", () => ({
  hdkey: {
    fromMasterSeed: jest.fn(),
  },
}));

jest.mock("web3");

const mockInitData = {
  index: 1,
  provider: "HTTP://127.0.0.1:7545",
  token: {
    contract_address: "0x123456789",
    abi: [
      {
        constant: true,
        inputs: [],
        name: "mintingFinished",
        outputs: [
          {
            name: "",
            type: "bool",
          },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    ],
  },
  mnemonic: "cat dog waffle perrier apple diamond hands unit testing this js module",
};

const mockAddressString = "0x12345";

describe("Root module test", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("init()", () => {
    it("Throws a missing initialization error if input data is undefined", async () => {
      const expectedError = new Error("You must provide initialization values");
      await expect(init(undefined)).rejects.toThrowError(expectedError);
    });
    it("Throws a no wallet index error if index is not a number", async () => {
      const data = {
        index: null,
      };

      const expectedError = new Error("No wallet index provided");
      await expect(init(data)).rejects.toThrowError(expectedError);
    });
    it("Throws a missing provider error if provider is falsey", async () => {
      const data = {
        index: 1,
      };

      const expectedError = new Error("No WS provider supplied");
      await expect(init(data)).rejects.toThrowError(expectedError);
    });
    it("Throws a missing token error if token is falsey", async () => {
      const data = {
        index: 1,
        provider: "HTTP://127.0.0.1:7545",
      };

      const expectedError = new Error("No token JSON supplied");
      await expect(init(data)).rejects.toThrowError(expectedError);
    });
    it("Throws a missing token abi error if token abi is not supplied", async () => {
      const data = {
        index: 1,
        provider: "HTTP://127.0.0.1:7545",
        token: {
          contract_address: "0x123456789",
        },
      };

      const expectedError = new Error("No token JSON ABI supplied");
      await expect(init(data)).rejects.toThrowError(expectedError);
    });
    it("Throws a missing token contact_address error if token contract_address is not supplied", async () => {
      const data = {
        index: 1,
        provider: "HTTP://127.0.0.1:7545",
        token: {
          abi: [
            {
              constant: true,
              inputs: [],
              name: "mintingFinished",
              outputs: [
                {
                  name: "",
                  type: "bool",
                },
              ],
              payable: false,
              stateMutability: "view",
              type: "function",
            },
          ],
        },
      };

      const expectedError = new Error(
        "No token JSON contract address provided"
      );
      await expect(init(data)).rejects.toThrowError(expectedError);
    });
    it("Generates a new mnemonic if input mnemonic is not provided", async () => {
      const data = {
        index: 1,
        provider: "HTTP://127.0.0.1:7545",
        token: {
          contract_address: "0x123456789",
          abi: [
            {
              constant: true,
              inputs: [],
              name: "mintingFinished",
              outputs: [
                {
                  name: "",
                  type: "bool",
                },
              ],
              payable: false,
              stateMutability: "view",
              type: "function",
            },
          ],
        },
      };

      await init(data);
      expect(bip39.generateMnemonic).toHaveBeenCalled();
    });
    it("Does not generate a new mnemonic if input mnemonic is provided", async () => {
      const data = {
        index: 1,
        provider: "HTTP://127.0.0.1:7545",
        token: {
          contract_address: "0x123456789",
          abi: [
            {
              constant: true,
              inputs: [],
              name: "mintingFinished",
              outputs: [
                {
                  name: "",
                  type: "bool",
                },
              ],
              payable: false,
              stateMutability: "view",
              type: "function",
            },
          ],
        },
        mnemonic:
          "cat dog waffle perrier apple diamond hands unit testing this js module",
      };

      await init(data);
      expect(bip39.generateMnemonic).not.toHaveBeenCalled();
    });
  });
  describe("newAccount()", () => {
    beforeEach(async () => {
      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddressString),
          }),
        }),
      });

      await init(mockInitData);
    })
    it("Returns the wallets address", async () => {
      const address = newAccount();
      expect(address).toEqual(mockAddressString);
    });
  });
  describe("getBalance", () => {
    beforeEach(async () => {
      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddressString),
          }),
        }),
      });

      Web3.mockReturnValueOnce({
        eth: {
          getBalance: jest.fn().mockResolvedValueOnce(10000),
        },
      });

      await init(mockInitData);
    })

    it("Returns the balance of the address", async () => {
      const balance = await getBalance(mockAddressString);
      expect(balance).toEqual(10000);
    });
  });
  describe("getTokenBalance", () => {
    beforeEach(async () => {
      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddressString),
          }),
        }),
      });

      Web3.mockReturnValueOnce({
        eth: {
          getBalance: jest.fn().mockResolvedValueOnce(10000),
          Contract: jest.fn().mockReturnValueOnce({
            methods: {
              balanceOf: jest.fn().mockReturnThis(),
              call: jest.fn().mockReturnValueOnce(5000)
            },
          }),
        },
      });

      await init(mockInitData);
    })
    it("Returns the token balance", async () => {
      const tokenBalance = await getTokenBalance(mockAddressString);
      expect(tokenBalance).toEqual(5000);
    });
  });
  describe("sendTokens", () => {
    it("Generates a contract using the token from the config", async () => {
      // Populate global config
      const data = {
        index: 1,
        provider: "HTTP://127.0.0.1:7545",
        token: {
          contract_address: "0x123456789",
          abi: [
            {
              constant: true,
              inputs: [],
              name: "mintingFinished",
              outputs: [
                {
                  name: "",
                  type: "bool",
                },
              ],
              payable: false,
              stateMutability: "view",
              type: "function",
            },
          ],
        },
        mnemonic:
          "cat dog waffle perrier apple diamond hands unit testing this js module",
      };

      const mockAddressString = "0x12345";

      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddressString),
            privateKey: {
              toString: jest.fn().mockReturnValueOnce('hello')
            }
          }),
        }),
      });

      const mockEth = {
        getBalance: jest.fn().mockResolvedValueOnce(10000),
        eth: {
          Contract: jest.fn().mockReturnValueOnce({
            methods: {
              balanceOf: jest.fn().mockReturnThis(),
              call: jest.fn().mockReturnValueOnce(5000),
              transfer: jest.fn().mockReturnThis(),
              estimateGas: jest.fn().mockReturnValueOnce(1.000),
              send: jest.fn().mockReturnValueOnce("whatever")
            },
          }),
          accounts: {
            privateKeyToAccount: jest.fn().mockReturnValueOnce(mockAddressString),
            wallet: {
              create: jest.fn(),
              add: jest.fn(),
            }
          }
        },
      };

      Web3.mockReturnValueOnce(mockEth)

      await init(data);
      newAccount();

      await sendTokens('0x12345', '0x67890', 1000);

      expect(mockEth.eth.Contract).toHaveBeenCalledWith(
        data.token.abi,
        data.token.contract_address,{
          from: '0x12345'
        }
      )
      expect(mockEth.eth.accounts.wallet.create).toHaveBeenCalled();
      expect(mockEth.eth.accounts.wallet.add).toHaveBeenCalled();
    });
    it("Transfers the amount to the specified address", async () => {
      // Populate global config
      const data = {
        index: 1,
        provider: "HTTP://127.0.0.1:7545",
        token: {
          contract_address: "0x123456789",
          abi: [
            {
              constant: true,
              inputs: [],
              name: "mintingFinished",
              outputs: [
                {
                  name: "",
                  type: "bool",
                },
              ],
              payable: false,
              stateMutability: "view",
              type: "function",
            },
          ],
        },
        mnemonic:
          "cat dog waffle perrier apple diamond hands unit testing this js module",
      };

      const mockAddressString = "0x12345";

      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddressString),
            privateKey: {
              toString: jest.fn().mockReturnValueOnce('hello')
            }
          }),
        }),
      });

      const mockEthContract = {
        methods: {
          balanceOf: jest.fn().mockReturnValueOnce({
            call: jest.fn().mockReturnValueOnce(5000),
          }),
          transfer: jest.fn().mockReturnThis(),
          estimateGas: jest.fn().mockReturnValueOnce(1.000),
          send: jest.fn().mockReturnValueOnce("whatever")
        },
      }

      const mockEth = {
        getBalance: jest.fn().mockResolvedValueOnce(10000),
        eth: {
          Contract: jest.fn().mockReturnValueOnce(mockEthContract),
          accounts: {
            privateKeyToAccount: jest.fn().mockReturnValueOnce(mockAddressString),
            wallet: {
              create: jest.fn(),
              add: jest.fn(),
            }
          }
        },
      };

      Web3.mockReturnValueOnce(mockEth)

      await init(data);
      newAccount();

      await sendTokens('0x12345', '0x67890', 1000);

      expect(mockEthContract.methods.estimateGas).toHaveBeenCalled();
      expect(mockEthContract.methods.transfer).toHaveBeenCalledWith('0x67890', 1000);
      expect(mockEthContract.methods.send).toHaveBeenCalledWith({
        from: '0x12345',
        gas: 1.000,
        value: 0x0,
      });
    });
  });
});
