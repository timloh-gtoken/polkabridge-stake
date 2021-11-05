import WalletConnectProvider from "@walletconnect/web3-provider";

const provider = new WalletConnectProvider({
  infuraId: `${process.env.REACT_APP_INFURA_KEY.split('').reverse().join('')}`,
  qrcodeModalOptions: {
    mobileLinks: ["metamask", "trust"],
  },
});

export default provider;
