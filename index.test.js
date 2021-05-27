const bip39 = require("bip39");
const Web3 = require("web3");
const { hdkey } = require("ethereumjs-wallet");

const {
  init,
  newAccount,
  getBalance,
  getTokenBalance,
  sendTokens,
} = require("./index");

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
  mnemonic:
    "cat dog waffle perrier apple diamond hands unit testing this js module",
};

const mockAddress = "0x12345";

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
      const missingIndex = {
        ...mockInitData,
        index: undefined,
      };

      const expectedError = new Error("No wallet index provided");
      await expect(init(missingIndex)).rejects.toThrowError(expectedError);
    });
    it("Throws a missing provider error if provider is falsey", async () => {
      const missingProvider = {
        ...mockInitData,
        provider: undefined,
      };

      const expectedError = new Error("No WS provider supplied");
      await expect(init(missingProvider)).rejects.toThrowError(expectedError);
    });
    it("Throws a missing token error if token is falsey", async () => {
      const missingToken = {
        ...mockInitData,
        token: undefined,
      };

      const expectedError = new Error("No token JSON supplied");
      await expect(init(missingToken)).rejects.toThrowError(expectedError);
    });
    it("Throws a missing token abi error if token abi is not supplied", async () => {
      const misingTokenAbi = {
        ...mockInitData,
        token: {
          contract_address: mockInitData.token.contract_address,
        },
      };

      const expectedError = new Error("No token JSON ABI supplied");
      await expect(init(misingTokenAbi)).rejects.toThrowError(expectedError);
    });
    it("Throws a missing token contact_address error if token contract_address is not supplied", async () => {
      const missingTokenContactAddress = {
        ...mockInitData,
        token: {
          ...mockInitData.token,
          contract_address: undefined,
        },
      };

      const expectedError = new Error(
        "No token JSON contract address provided"
      );
      await expect(init(missingTokenContactAddress)).rejects.toThrowError(
        expectedError
      );
    });
    it("Generates a new mnemonic if input mnemonic is not provided", async () => {
      const missingMnemonic = {
        ...mockInitData,
        mnemonic: undefined,
      };

      await init(missingMnemonic);
      expect(bip39.generateMnemonic).toHaveBeenCalled();
    });
    it("Does not generate a new mnemonic if input mnemonic is provided", async () => {
      await init(mockInitData);
      expect(bip39.generateMnemonic).not.toHaveBeenCalled();
    });
  });

  describe("newAccount()", () => {
    beforeEach(async () => {
      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddress),
          }),
        }),
      });

      await init(mockInitData);
    });
    it("Returns the wallets address", async () => {
      const address = newAccount();
      expect(address).toEqual(mockAddress);
    });
  });

  describe("getBalance", () => {
    beforeEach(async () => {
      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddress),
          }),
        }),
      });

      Web3.mockReturnValueOnce({
        eth: {
          getBalance: jest.fn().mockResolvedValueOnce(10000),
        },
      });

      await init(mockInitData);
    });

    it("Returns the balance of the address", async () => {
      const balance = await getBalance(mockAddress);
      expect(balance).toEqual(10000);
    });
  });

  describe("getTokenBalance", () => {
    beforeEach(async () => {
      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddress),
          }),
        }),
      });

      Web3.mockReturnValueOnce({
        eth: {
          getBalance: jest.fn().mockResolvedValueOnce(10000),
          Contract: jest.fn().mockReturnValueOnce({
            methods: {
              balanceOf: jest.fn().mockReturnThis(),
              call: jest.fn().mockReturnValueOnce(5000),
            },
          }),
        },
      });

      await init(mockInitData);
    });
    it("Returns the token balance", async () => {
      const tokenBalance = await getTokenBalance(mockAddress);
      expect(tokenBalance).toEqual(5000);
    });
  });

  describe("sendTokens", () => {
    let mockEthContract;
    let mockEth;

    const fromAddress = "0x12345";
    const toAddress = "0x67890";
    const amount = 1000;

    beforeEach(async () => {
      hdkey.fromMasterSeed.mockReturnValueOnce({
        derivePath: jest.fn().mockReturnValueOnce({
          getWallet: jest.fn().mockReturnValueOnce({
            getAddressString: jest.fn().mockReturnValueOnce(mockAddress),
            privateKey: {
              toString: jest.fn().mockReturnValueOnce("hello"),
            },
          }),
        }),
      });

      mockEthContract = {
        methods: {
          balanceOf: jest.fn().mockReturnValue({
            call: jest.fn().mockReturnValue(5000),
          }),
          transfer: jest.fn().mockReturnThis(),
          estimateGas: jest.fn().mockReturnValue(1.0),
          send: jest.fn().mockReturnValue("whatever"),
        },
      };

      mockEth = {
        getBalance: jest.fn().mockResolvedValueOnce(10000),
        eth: {
          Contract: jest.fn().mockReturnValueOnce(mockEthContract),
          accounts: {
            privateKeyToAccount: jest.fn().mockReturnValueOnce(mockAddress),
            wallet: {
              create: jest.fn(),
              add: jest.fn(),
            },
          },
        },
      };

      Web3.mockReturnValueOnce(mockEth);
      await init(mockInitData);
      newAccount();
    });
    it("Generates a contract using the token from the config", async () => {
      await sendTokens(fromAddress, toAddress, amount);

      expect(mockEth.eth.Contract).toHaveBeenCalledWith(
        mockInitData.token.abi,
        mockInitData.token.contract_address,
        {
          from: fromAddress,
        }
      );
      expect(mockEth.eth.accounts.wallet.create).toHaveBeenCalled();
      expect(mockEth.eth.accounts.wallet.add).toHaveBeenCalled();
    });
    it("Transfers the amount to the specified address", async () => {
      await sendTokens(fromAddress, toAddress, amount);

      expect(mockEthContract.methods.estimateGas).toHaveBeenCalled();
      expect(mockEthContract.methods.transfer).toHaveBeenCalledWith(
        toAddress,
        amount
      );
      expect(mockEthContract.methods.send).toHaveBeenCalledWith({
        from: fromAddress,
        gas: 1.0,
        value: 0x0,
      });
    });
  });
});
