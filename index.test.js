const bip39 = require("bip39");
const { hdkey } = require("ethereumjs-wallet");

const { init } = require("./index");

jest.mock("bip39", () => ({
  generateMnemonic: jest.fn(),
  mnemonicToSeed: jest.fn(),
}));

jest.mock("ethereumjs-wallet", () => ({
  hdkey: {
    fromMasterSeed: jest.fn(),
  },
}));

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
});
