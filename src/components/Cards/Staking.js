import { CircularProgress, makeStyles } from "@material-ui/core";
import { useEffect, useState } from "react";
import pbrImg from "../../assets/balance.png";
import biteImg from "../../assets/bite.png";
import corgiImg from "../../assets/corgi.png";
import pwarImg from "../../assets/pwar.png";
import clf365Img from "../../assets/clf365.png";
import CustomButton from "../Buttons/CustomButton";
import { formatCurrency, fromWei, toWei } from "../../utils/helper";
import { connect } from "react-redux";
import {
  confirmAllowance,
  getUserStakedData,
  getPoolInfo,
  unstakeTokens,
} from "../../actions/stakeActions";
import { getAccountBalance } from "../../actions/accountActions";
import {
  BITE,
  claimTokens,
  CFL365,
  etheriumNetwork,
  PWAR,
} from "../../constants";

const useStyles = makeStyles((theme) => ({
  card: {
    width: 470,
    height: 350,

    [theme.breakpoints.down("sm")]: {
      paddingLeft: 0,
      paddingRight: 0,
      width: 300,
      height: 380,
    },
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    backdropFilter: "blur(20px)",
    transform: "perspective(500px)",
    transformStyle: "preserve-3d",
  },
  cardContents: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-around",
    height: "100%",
    width: "100%",
    textShadow: "0 0 1em transparentize($black, 0.5)",
    background: "transparentize($white, 0.8)",
  },
  avatar: {
    width: 30,
    height: "auto",
    marginLeft: 60,
  },
  cardHeading: {
    fontSize: 18,
    [theme.breakpoints.down("sm")]: {},
  },
  cardText: {
    fontSize: 14,
    alignSelf: "start",
    marginLeft: 60,
    margin: 0,
  },
  buttons: {
    marginTop: 20,
    marginBottom: 20,
  },
  numbers: {
    color: "#E0077D",
    fontSize: 26,
  },
  hint: {
    fontSize: 12,
    fontWeight: 500,
    color: "#919191",
    [theme.breakpoints.down("sm")]: {
      fontSize: 10,
    },
  },
  bitePool: {
    marginBottom: 20,
    alignSelf: "start",
  },
  poolItemText: {
    fontSize: 13,
    marginLeft: 60,
    margin: 0,
    marginTop: 2,
    [theme.breakpoints.down("sm")]: {
      fontSize: 10,
    },
  },
  stakeButtons: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap-reverse",
  },
  stakeButton: {
    marginTop: 5,
    alignSelf: "center",
    justifySelf: "center",
  },
}));

const Staking = ({
  stake: { stake, pool, approved },
  account: { currentAccount, currentNetwork, loading, error },
  tokenType,
  getUserStakedData,
  confirmAllowance,
  getPoolInfo,
  getAccountBalance,
  unstakeTokens,
  onStake,
  onUnstake,
}) => {
  const classes = useStyles();

  useEffect(async () => {
    getUserStakedData(tokenType, currentNetwork);
  }, [currentAccount, currentNetwork]);

  const handleApprove = async (tokenType) => {
    const tokenWeiAmountToApprove =
      currentNetwork === etheriumNetwork
        ? toWei("999999999")
        : "999999999999999999999999999999999999";

    await confirmAllowance(
      tokenWeiAmountToApprove,
      tokenType,
      currentNetwork,
      currentAccount
    );
    // alert(
    //   `tokenType: ${tokenType}  currentNetwork: ${currentNetwork} tokenAmount:  ${tokenWeiAmountToApprove}`
    // );
    await getUserStakedData(tokenType, currentNetwork);
  };

  const handleClaim = async (tokenType) => {
    const tokensToClaim = claimTokens;

    await unstakeTokens(
      tokensToClaim,
      currentAccount,
      tokenType,
      currentNetwork
    );
    await Promise.all([
      getPoolInfo(currentNetwork),
      getAccountBalance(currentNetwork),
    ]);
  };

  const currentAmount = (tokenType) => {
    return stake[tokenType] ? stake[tokenType].amount : 0;
  };

  const tokenLogo = {
    PBR: pbrImg,
    BITE: biteImg,
    CORGIB: corgiImg,
    PWAR: pwarImg,
    CFL365: clf365Img,
  };

  const getCurrentApy = () => {
    if (tokenType === "BITE") {
      return pool[tokenType] ? pool[tokenType].biteApy : "0";
    } else if (tokenType === PWAR) {
      return pool[tokenType] ? pool[tokenType].pwarApy : "0";
    } else {
      return pool[tokenType] ? pool[tokenType].clf365Apy : "0";
    }
  };

  const getCurrencyFormatForToken = (tokenType, tokens) => {
    if (tokenType === BITE) {
      return formatCurrency(fromWei(tokens));
    } else if (tokenType === CFL365) {
      return formatCurrency(fromWei(tokens));
    } else {
      return formatCurrency(fromWei(tokens), false, 1, true);
    }
  };

  return (
    <div className={classes.card}>
      <div className="card-theme">
        <div className={classes.cardContents}>
          <h6 className={classes.cardHeading}>Staking Pool</h6>
          {loading[tokenType] ? (
            <div>
              <CircularProgress className={classes.numbers} />
            </div>
          ) : (
            <>
              <div className={classes.cardHeader}>
                <br />
                <img className={classes.avatar} src={tokenLogo[tokenType]} />
                <small
                  style={{
                    color: "#f9f9f9",
                    marginTop: 8,
                    marginLeft: 5,
                    marginRight: 22,
                    fontSize: 18,
                  }}
                >
                  {tokenType}
                </small>
              </div>

              {["BITE", "PWAR", CFL365].includes(tokenType) ? (
                <div className={classes.bitePool}>
                  <p className={classes.poolItemText}>
                    <strong>{tokenType} APY: </strong>{" "}
                    {formatCurrency(getCurrentApy(), false, 1, true)} %
                  </p>
                  <p className={classes.poolItemText}>
                    <strong>Total token staked:</strong>{" "}
                    {getCurrencyFormatForToken(
                      tokenType,
                      pool[tokenType] ? pool[tokenType].totalTokenStaked : "0"
                    )}
                    {/* {tokenType === "PWAR"
                      ? formatCurrency(
                          fromWei(pool[tokenType].totalTokenStaked),
                          false,
                          1,
                          true
                        )
                      : formatCurrency(
                          fromWei(pool[tokenType].totalTokenStaked)
                        )}{" "} */}
                    {tokenType}
                  </p>
                  {/* {tokenType === "PWAR" ? (
                    <p className={classes.poolItemText}>
                      <strong style={{ marginTop: 5 }}>
                        Total token claimed:
                      </strong>{" "}
                      {formatCurrency(
                        fromWei(pool[tokenType].totalTokenClaimed),
                        false,
                        1,
                        true
                      )}{" "}
                      {tokenType}
                    </p>
                  ) : (
                    ""
                  )} */}
                  <p className={classes.poolItemText}>
                    <strong style={{ marginTop: 5 }}>
                      Total token claimed:
                    </strong>{" "}
                    {formatCurrency(
                      fromWei(
                        pool[tokenType]
                          ? pool[tokenType].totalTokenClaimed
                          : "0"
                      ),
                      false,
                      1,
                      true
                    )}{" "}
                    {tokenType}
                  </p>
                </div>
              ) : (
                ""
              )}

              <>
                <p className={classes.cardText}>
                  <strong>Staked: </strong>{" "}
                  {tokenType === "PWAR"
                    ? formatCurrency(
                        fromWei(stake[tokenType].amount),
                        false,
                        1,
                        true
                      )
                    : formatCurrency(fromWei(stake[tokenType].amount))}{" "}
                  {tokenType}
                </p>
                <p className={classes.cardText}>
                  <strong>Claimed rewards: </strong>{" "}
                  {tokenType === "PWAR"
                    ? formatCurrency(
                        fromWei(stake[tokenType].rewardClaimed),
                        false,
                        1,
                        true
                      )
                    : formatCurrency(
                        fromWei(stake[tokenType].rewardClaimed)
                      )}{" "}
                  {tokenType}
                </p>
                <p className={classes.cardText}>
                  <strong>Pending rewards: </strong>{" "}
                  {tokenType === "PWAR"
                    ? formatCurrency(
                        fromWei(stake[tokenType].pendingReward),
                        false,
                        1,
                        true
                      )
                    : formatCurrency(
                        fromWei(stake[tokenType].pendingReward)
                      )}{" "}
                  {tokenType}
                </p>
              </>

              <div className={classes.buttons}>
                {!approved[tokenType] ? (
                  <div>
                    <CustomButton onClick={() => handleApprove(tokenType)}>
                      Approve
                    </CustomButton>
                    <p className={classes.hint}>
                      ! Approve PBR tokens to start staking
                    </p>
                  </div>
                ) : (
                  <div className={classes.stakeButtons}>
                    <CustomButton
                      disabled={currentAmount(tokenType) == 0}
                      onClick={() => handleClaim(tokenType)}
                    >
                      Claim
                    </CustomButton>

                    <CustomButton onClick={() => onStake(tokenType)}>
                      Stake
                    </CustomButton>
                    <CustomButton
                      onClick={() => onUnstake(tokenType)}
                      variant="light"
                    >
                      Unstake
                    </CustomButton>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  stake: state.stake,
  account: state.account,
});

export default connect(mapStateToProps, {
  getUserStakedData,
  confirmAllowance,
  getPoolInfo,
  getAccountBalance,
  unstakeTokens,
})(Staking);
