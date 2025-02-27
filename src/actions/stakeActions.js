import axios from "axios";
import {
  ERROR,
  SHOW_LOADING,
  HIDE_LOADING,
  LOAD_BALANCE,
  LOAD_PBR_MARKET_DATA,
  LOAD_STAKE_POOL,
  ALLOWANCE_UPDATE,
  GET_USER_STAKE_DATA,
} from "./types";

import { stakeContract, erc20TokenContract } from "../contracts/connections";
import { toWei, getCurrentAccount, getApy } from "../utils/helper";
import BigNumber from "bignumber.js";
import config from "../config";
import {
  bscNetwork,
  AOG,
  maticNetwork,
  poolId,
  tokenContarctAddresses,
  tokenPriceConstants,
  coingeckoTokenId,
  stakeContractAdrresses,
} from "../constants";

const fetchTokenPrice = async (tokenSymbol) => {
  try {
    if (!tokenSymbol) {
      return null;
    }

    if (Object.keys(tokenPriceConstants).includes(tokenSymbol)) {
      return tokenPriceConstants[tokenSymbol];
    }

    const token_id = coingeckoTokenId?.[tokenSymbol];

    const priceRes = await axios.get(
      config.coingecko +
        `/v3/simple/price?ids=${token_id}&vs_currencies=usd&include_market_cap=false&include_24hr_vol=false&include_24hr_change=false&include_last_updated_at=false`
    );
    const priceData = priceRes.data;
    const tokenPrice = priceData?.[token_id] ? priceData[token_id].usd : "---";

    return tokenPrice;
  } catch (error) {
    console.log("fetchTokenPrice ", { tokenSymbol, error });
    return 0;
  }
};

export const fetchPbrMarketData = () => async (dispatch) => {
  try {
    const { data } = await axios.get(
      config.coingecko +
        "/v3/simple/price?ids=polkabridge&vs_currencies=usd&include_market_cap=true&include_24hr_vol=false&include_24hr_change=true&include_last_updated_at=true"
    );

    const pbrObj = {};

    pbrObj.tokenPrice = data.polkabridge ? data.polkabridge.usd : "---";
    pbrObj.mCap = data.polkabridge ? data.polkabridge.usd_market_cap : "---";
    pbrObj.change = data.polkabridge ? data.polkabridge.usd_24h_change : "---";

    dispatch({
      type: LOAD_PBR_MARKET_DATA,
      payload: pbrObj,
    });
  } catch (error) {
    console.log("fetchPbrMarketData", { error });
  }
};

const getTokenBalance = async (tokenContract, account) => {
  try {
    const balance = await tokenContract.methods.balanceOf(account).call();
    return balance;
  } catch (error) {
    console.log("getTokenBalance ", error);
    return 0;
  }
};

export const getPoolInfo =
  (tokenSymbol, pid, account, network) => async (dispatch) => {
    try {
      if (!tokenSymbol) {
        return;
      }

      // console.log('getting pool info ', { pid, account, network })

      const currStakingContract = stakeContract(network);
      const tokenAddress = tokenContarctAddresses?.[network]?.[tokenSymbol];
      const tokenContract = erc20TokenContract(network, tokenAddress);

      const [poolInfo, tokenPrice, tokenBalance] = await Promise.all([
        currStakingContract.methods.getPoolInfo(pid).call(),
        fetchTokenPrice(tokenSymbol),
        getTokenBalance(tokenContract, account),
      ]);
      const poolObj = {
        accTokenPerShare: poolInfo[0],
        lastRewardBlock: poolInfo[1],
        rewardPerBlock: poolInfo[2],
        totalTokenStaked: poolInfo[3],
        totalTokenClaimed: poolInfo[4],
      };

      poolObj.tokenPrice = tokenPrice;
      const apy = getApy(tokenSymbol, poolObj, network);
      poolObj.apy = apy;

      const poolState = {};
      poolState[tokenSymbol] = poolObj;

      dispatch({
        type: LOAD_STAKE_POOL,
        payload: poolState,
      });

      const balanceObject = {};
      balanceObject[tokenSymbol] = tokenBalance;
      dispatch({
        type: LOAD_BALANCE,
        payload: balanceObject,
      });
    } catch (error) {
      console.log("getPoolInfo  ", { error, tokenSymbol, network, pid });
    }
  };

export const checkAllowance =
  (tokenSymbol, account, network) => async (dispatch) => {
    try {
      if (!account) {
        return;
      }

      const stakeContractAddress = stakeContractAdrresses?.[network];

      const tokenAddress = tokenContarctAddresses?.[network]?.[tokenSymbol];
      const currTokenContract = erc20TokenContract(network, tokenAddress);

      const allowance = await currTokenContract.methods
        .allowance(account, stakeContractAddress)
        .call();

      const apprObj = {};
      if (new BigNumber(allowance).gt(0)) {
        apprObj[tokenSymbol] = true;
      } else {
        apprObj[tokenSymbol] = false;
      }

      dispatch({
        type: ALLOWANCE_UPDATE,
        payload: apprObj,
      });
    } catch (error) {
      dispatch({
        type: ERROR,
        payload: "Alowance Error!",
      });
    }
  };

export const confirmAllowance =
  (balance, tokenType, network, account) => async (dispatch) => {
    try {
      const loadingObj = {};
      loadingObj[`${tokenType}`] = true;
      dispatch({
        type: SHOW_LOADING,
        payload: loadingObj,
      });

      const tokenAddress = tokenContarctAddresses?.[network]?.[tokenType];
      const tokenContract = erc20TokenContract(network, tokenAddress);

      const stakeContractAddress = stakeContractAdrresses?.[network];

      await tokenContract.methods
        .approve(stakeContractAddress, balance)
        .send({ from: account, gasPrice: 100000000000 });

      const apprObj = {};
      apprObj[tokenType] = true;
      dispatch({
        type: ALLOWANCE_UPDATE,
        payload: apprObj,
      });
    } catch (error) {
      console.log("confirmAllowance ", { error, tokenType });
    }
    dispatch({
      type: HIDE_LOADING,
      payload: tokenType,
    });
  };

export const getUserStakedData = (tokenType, network) => async (dispatch) => {
  const loadingObj = {};
  loadingObj[`${tokenType}`] = true;
  dispatch({
    type: SHOW_LOADING,
    payload: loadingObj,
  });

  try {
    const account = await getCurrentAccount();

    const tokenAddress = tokenContarctAddresses?.[network]?.[tokenType];
    const tokenContract = erc20TokenContract(network, tokenAddress);

    const pool = poolId[tokenType];
    const currStakeContract = stakeContract(network);

    const allowance = await tokenContract.methods
      .allowance(account, currStakeContract._address)
      .call();

    const apprObj = {};
    if (new BigNumber(allowance).gt(0)) {
      apprObj[tokenType] = true;
    } else {
      apprObj[tokenType] = false;
    }

    dispatch({
      type: ALLOWANCE_UPDATE,
      payload: apprObj,
    });

    const [stakedData, pendingReward] = await Promise.all([
      currStakeContract.methods.userInfo(pool, account).call(),
      currStakeContract.methods.pendingReward(pool, account).call(),
    ]);

    const stakeObj = {};

    stakeObj[tokenType] = {
      amount: stakedData.amount,
      rewardClaimed: stakedData.rewardClaimed,
      pendingReward: pendingReward,
    };

    dispatch({
      type: GET_USER_STAKE_DATA,
      payload: stakeObj,
    });
  } catch (error) {
    dispatch({
      type: ERROR,
      payload: "Failed to update balance",
    });
  }
  dispatch({
    type: HIDE_LOADING,
    payload: tokenType,
  });
};

export const stakeTokens =
  (tokens, account, tokenType, network) => async (dispatch) => {
    const loadingObj = {};
    loadingObj[`${tokenType}`] = true;
    dispatch({
      type: SHOW_LOADING,
      payload: loadingObj,
    });
    const depositTokens = toWei(tokens, "ether");

    const pool = poolId[tokenType];

    try {
      const tokenAddress = tokenContarctAddresses?.[network]?.[tokenType];
      const currTokenContract = erc20TokenContract(network, tokenAddress);
      const currStakeContract = stakeContract(network);

      if (network === maticNetwork) {
        await currStakeContract.methods
          .deposit(pool, depositTokens)
          .send({ from: account, gasPrice: 100000000000 });
      } else {
        await currStakeContract.methods
          .deposit(pool, depositTokens)
          .send({ from: account });
      }

      const [balanceWei, stakedData, pendingReward] = await Promise.all([
        currTokenContract.methods.balanceOf(account).call(),
        currStakeContract.methods.userInfo(pool, account).call(),
        currStakeContract.methods.pendingReward(pool, account).call(),
      ]);

      const balanceObj = {};
      balanceObj[`${tokenType}`] = balanceWei;
      dispatch({
        type: LOAD_BALANCE,
        payload: balanceObj,
      });

      const stakeObj = {};
      stakeObj[tokenType] = {
        amount: stakedData.amount,
        rewardClaimed: stakedData.rewardClaimed,
        pendingReward: pendingReward,
      };
      dispatch({
        type: GET_USER_STAKE_DATA,
        payload: stakeObj,
      });
    } catch (error) {
      dispatch({
        type: ERROR,
        payload: network === bscNetwork ? error.message : error,
      });
    }
    dispatch({
      type: HIDE_LOADING,
      payload: tokenType,
    });
  };

export const unstakeTokens =
  (tokens, account, tokenType, network) => async (dispatch) => {
    const loadingObj = {};
    loadingObj[`${tokenType}`] = true;
    dispatch({
      type: SHOW_LOADING,
      payload: loadingObj,
    });

    const depositTokens = toWei(tokens, "ether");
    const pool = poolId[tokenType];
    const currStakeContract = stakeContract(network);

    const tokenAddress = tokenContarctAddresses?.[network]?.[tokenType];
    const currTokenContract = erc20TokenContract(network, tokenAddress);

    try {
      if (network === maticNetwork) {
        await currStakeContract.methods
          .withdraw(pool, depositTokens)
          .send({ from: account, gasPrice: 100000000000 });
      } else {
        if (tokenType === AOG) {
          await currStakeContract.methods
            .emergencyWithdraw(pool)
            .send({ from: account });
        } else {
          await currStakeContract.methods
            .withdraw(pool, depositTokens)
            .send({ from: account });
        }
      }

      const [balanceWei, stakedData, pendingReward] = await Promise.all([
        currTokenContract.methods.balanceOf(account).call(),
        currStakeContract.methods.userInfo(pool, account).call(),
        currStakeContract.methods.pendingReward(pool, account).call(),
      ]);

      const balanceObj = {};
      balanceObj[`${tokenType}`] = balanceWei;

      dispatch({
        type: LOAD_BALANCE,
        payload: balanceObj,
      });

      const stakeObj = {};
      stakeObj[tokenType] = {
        amount: stakedData.amount,
        rewardClaimed: stakedData.rewardClaimed,
        pendingReward: pendingReward,
      };

      dispatch({
        type: GET_USER_STAKE_DATA,
        payload: stakeObj,
      });
    } catch (error) {
      dispatch({
        type: ERROR,
        payload: network === bscNetwork ? error.message : error,
      });
    }
    dispatch({
      type: HIDE_LOADING,
      payload: tokenType,
    });
  };
