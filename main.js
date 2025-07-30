async function connectWallet() {
  console.log("connectWallet: Function started.");
  document.getElementById("walletAddress").innerText = `กำลังเชื่อมต่อ...`;
  document.getElementById("walletAddress").classList.remove("success", "error");

  if (typeof window.ethereum === 'undefined') {
    alert("กรุณาติดตั้ง MetaMask หรือ Bitget Wallet หรือเปิด DApp ผ่าน Browser ใน Wallet App");
    document.getElementById("walletAddress").innerText = `❌ ไม่พบ Wallet Extension`;
    document.getElementById("walletAddress").classList.add("error");
    console.error("connectWallet: window.ethereum is undefined.");
    return;
  }

  try {
    web3 = new Web3(window.ethereum);
    console.log("connectWallet: Web3 instance created.");
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    account = accounts[0];

    const currentChainId = await web3.eth.getChainId();
    const currentChainIdHex = web3.utils.toHex(currentChainId);
    const currentBSC_CHAIN_ID = typeof window.BSC_CHAIN_ID !== 'undefined' ? window.BSC_CHAIN_ID : '0x38';

    if (currentChainIdHex !== currentBSC_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: currentBSC_CHAIN_ID }],
        });
        const newAccounts = await web3.eth.getAccounts();
        account = newAccounts[0];
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: currentBSC_CHAIN_ID,
                chainName: 'Binance Smart Chain Mainnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/'],
              }],
            });
            const newAccounts = await web3.eth.getAccounts();
            account = newAccounts[0];
          } catch (addError) {
            console.error("connectWallet: Error adding BSC:", addError);
            alert("❌ กรุณาเพิ่ม Binance Smart Chain ด้วยตนเอง");
            document.getElementById("walletAddress").innerText = `❌ การเชื่อมต่อล้มเหลว`;
            document.getElementById("walletAddress").classList.add("error");
            return;
          }
        } else {
          console.error("connectWallet: Switch error:", switchError);
          alert("❌ กรุณาสลับไป Binance Smart Chain ด้วยตนเอง");
          document.getElementById("walletAddress").innerText = `❌ การเชื่อมต่อล้มเหลว`;
          document.getElementById("walletAddress").classList.add("error");
          return;
        }
      }
    }

    document.getElementById("walletAddress").innerText = `✅ ${account}`;
    document.getElementById("walletAddress").classList.add("success");

    if (
      typeof window.contractAddress === 'undefined' ||
      typeof window.stakingABI === 'undefined' ||
      typeof window.usdtAddress === 'undefined' ||
      typeof window.usdtABI === 'undefined' ||
      typeof window.kjcAddress === 'undefined' ||
      typeof window.routerAddress === 'undefined' ||
      typeof window.BSC_CHAIN_ID === 'undefined'
    ) {
      alert("❌ การตั้งค่า config.js ไม่สมบูรณ์");
      document.getElementById("walletAddress").innerText = `❌ การเชื่อมต่อล้มเหลว: config.js error`;
      document.getElementById("walletAddress").classList.add("error");
      return;
    }

    stakingContract = new web3.eth.Contract(stakingABI, contractAddress);
    routerContract = new web3.eth.Contract(ROUTER_ABI_MINIMAL, routerAddress);
    usdtContract = new web3.eth.Contract(usdtABI, usdtAddress);
    kjcContract = new web3.eth.Contract(ERC20_ABI_MINIMAL, kjcAddress);

    usdtDecimals = await getTokenDecimals(usdtContract, 18);
    kjcDecimals = await getTokenDecimals(kjcContract, 18);

    generateReferralLink();
    loadStakingInfo();
    loadReferralInfo();

  } catch (error) {
    console.error("❌ connectWallet: Uncaught error:", error);
    const errorMessage = getFriendlyErrorMessage(error);
    alert("❌ การเชื่อมต่อกระเป๋าล้มเหลว: " + errorMessage);
    document.getElementById("walletAddress").innerText = `❌ การเชื่อมต่อล้มเหลว`;
    document.getElementById("walletAddress").classList.add("error");
  }
}
function generateReferralLink() {
  if (!account) {
    document.getElementById("refLink").value = "โปรดเชื่อมต่อกระเป๋าเพื่อสร้างลิงก์";
    return;
  }
  const link = `${window.location.origin}${window.location.pathname}?ref=${account}`;
  document.getElementById("refLink").value = link;
}

function copyRefLink() {
  const input = document.getElementById("refLink");
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value);
  alert("✅ คัดลอกลิงก์เรียบร้อยแล้ว!");
}
function getReferrerFromURL() {
  if (web3 && web3.utils) {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref && web3.utils.isAddress(ref)) {
      document.getElementById("refAddress").value = ref;
    }
  } else {
    console.warn("getReferrerFromURL: web3 หรือ utils ยังไม่พร้อม");
  }
}
async function registerReferrer() {
  if (!stakingContract || !account) {
    alert("กรุณาเชื่อมกระเป๋าก่อน");
    return;
  }

  const ref = document.getElementById("refAddress").value;
  if (!web3.utils.isAddress(ref) || ref.toLowerCase() === account.toLowerCase()) {
    alert("❌ Referrer address ไม่ถูกต้อง หรือเป็น Address ของคุณเอง");
    return;
  }

  document.getElementById("registerStatus").innerText = "กำลังดำเนินการสมัคร Referrer...";
  document.getElementById("registerStatus").classList.remove("error", "success");

  try {
    const txResponse = await stakingContract.methods.setReferrer(ref).send({ from: account });
    console.log("registerReferrer: Tx Hash:", txResponse.transactionHash);
    
    document.getElementById("registerStatus").innerText = "กำลังรอการยืนยันการสมัคร Referrer...";
    const receipt = await web3.eth.getTransactionReceipt(txResponse.transactionHash);

    if (receipt && receipt.status) {
      document.getElementById("registerStatus").innerText = "✅ สมัคร Referrer สำเร็จแล้ว!";
      document.getElementById("registerStatus").classList.add("success");
      console.log("registerReferrer: Confirmed:", receipt);
    } else {
      document.getElementById("registerStatus").innerText = "❌ การสมัคร Referrer ไม่สำเร็จ หรือธุรกรรมถูกปฏิเสธ";
      document.getElementById("registerStatus").classList.add("error");
      console.error("registerReferrer: Failed or not confirmed:", receipt);
    }

  } catch (e) {
    console.error("registerReferrer: Error:", e);
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("registerStatus").innerText = `❌ เกิดข้อผิดพลาดในการสมัคร Referrer: ${errorMessage}`;
    document.getElementById("registerStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการสมัคร Referrer: ${errorMessage}`);
  }
}
async function buyToken() {
  if (!stakingContract || !account || !usdtContract || !routerContract || typeof usdtDecimals === 'undefined' || typeof kjcDecimals === 'undefined') {
    alert("⚠️ กำลังโหลดข้อมูล กรุณารอสักครู่แล้วลองใหม่");
    console.warn("buyToken: Contracts or decimals not initialized yet.");
    return;
  }

  const rawInput = document.getElementById("usdtAmount").value.trim();
  if (!rawInput || isNaN(rawInput) || parseFloat(rawInput) <= 0) {
    alert("❌ กรุณาใส่จำนวน USDT ที่จะใช้ซื้อให้ถูกต้อง (ต้องมากกว่า 0)");
    return;
  }

  const usdtAmountFloat = parseFloat(rawInput);
  const usdtInWei = tokenToWei(usdtAmountFloat, usdtDecimals);
  
  console.log(`buyToken: USDT Amount (User Input): ${usdtAmountFloat}`);
  console.log(`buyToken: USDT Amount (in Wei): ${usdtInWei}`);

  document.getElementById("buyTokenStatus").innerText = "กำลังดำเนินการซื้อ KJC...";
  document.getElementById("buyTokenStatus").classList.remove("error", "success");

  try {
    if (!web3.utils.isAddress(usdtAddress) || !web3.utils.isAddress(kjcAddress)) {
      alert("❌ ที่อยู่ Token ไม่ถูกต้องใน config.js");
      document.getElementById("buyTokenStatus").innerText = "❌ ที่อยู่ Token ไม่ถูกต้อง";
      document.getElementById("buyTokenStatus").classList.add("error");
      return;
    }

    const path = [usdtAddress, kjcAddress];
    const amountsOut = await routerContract.methods.getAmountsOut(usdtInWei, path).call();
    const expectedKjcOutWei = BigInt(amountsOut[1]);
    const SLIPPAGE_PERCENTAGE = 5;
    const minOut = expectedKjcOutWei * BigInt(100 - SLIPPAGE_PERCENTAGE) / 100n;

    const allowance = await usdtContract.methods.allowance(account, contractAddress).call();

    if (BigInt(allowance) < BigInt(usdtInWei)) {
      document.getElementById("buyTokenStatus").innerText = "กำลังขออนุมัติ USDT...";
      const approveTx = await usdtContract.methods.approve(contractAddress, usdtInWei).send({ from: account });
      console.log("buyToken: Approve Tx:", approveTx.transactionHash);
      alert("✅ การอนุมัติ USDT สำเร็จแล้ว! กรุณากด 'ซื้อเหรียญ KJC' อีกครั้ง");
      document.getElementById("buyTokenStatus").innerText = "✅ อนุมัติสำเร็จ! กดอีกครั้งเพื่อซื้อ";
      document.getElementById("buyTokenStatus").classList.add("success");
      return;
    }

    document.getElementById("buyTokenStatus").innerText = "กำลังส่งธุรกรรมซื้อและ Stake...";
    const buyTx = await stakingContract.methods.buyAndStake(usdtInWei, minOut.toString()).send({ from: account });

    document.getElementById("buyTokenStatus").innerText = "กำลังรอการยืนยันการซื้อ KJC...";
    const receipt = await web3.eth.getTransactionReceipt(buyTx.transactionHash);

    if (receipt && receipt.status) {
      alert(`✅ ซื้อ ${usdtAmountFloat} USDT และ Stake สำเร็จ!`);
      document.getElementById("buyTokenStatus").innerText = `✅ ซื้อ ${usdtAmountFloat} USDT และ Stake สำเร็จ!`;
      document.getElementById("buyTokenStatus").classList.add("success");
      loadStakingInfo();
      loadReferralInfo();
    } else {
      alert(`❌ การซื้อไม่สำเร็จ หรือธุรกรรมถูกปฏิเสธ`);
      document.getElementById("buyTokenStatus").innerText = `❌ การซื้อ KJC ไม่สำเร็จ!`;
      document.getElementById("buyTokenStatus").classList.add("error");
    }

  } catch (e) {
    console.error("buyToken: Error:", e);
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("buyTokenStatus").innerText = `❌ ข้อผิดพลาด: ${errorMessage}`;
    document.getElementById("buyTokenStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการซื้อเหรียญ: ${errorMessage}`);
  }
}
async function loadStakingInfo() {
  if (!stakingContract || !account || typeof kjcDecimals === 'undefined') {
    document.getElementById("stakeAmount").innerText = "⚠️ กำลังโหลดข้อมูล...";
    console.warn("loadStakingInfo: Contracts or decimals not initialized.");
    return;
  }

  try {
    const rawAmount = await stakingContract.methods.stakedAmount(account).call();
    const stakeTime = await stakingContract.methods.lastStakeTime(account).call();
    const duration = await stakingContract.methods.STAKE_DURATION().call();

    const display = displayWeiToToken(rawAmount, kjcDecimals);
    const depositDate = new Date(Number(stakeTime) * 1000);
    const endDate = new Date((Number(stakeTime) + Number(duration)) * 1000);
    const formatDate = (d) => d.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    document.getElementById("stakeAmount").innerHTML = `
      💰 จำนวน: ${display} KJC<br/>
      📅 ฝากเมื่อ: ${formatDate(depositDate)}<br/>
      ⏳ ครบกำหนด: ${formatDate(endDate)}
    `;
    console.log("loadStakingInfo: Staking info loaded.");
  } catch (e) {
    console.error("loadStakingInfo: Error:", e);
    document.getElementById("stakeAmount").innerText = "❌ โหลดไม่สำเร็จ: " + (e.message || "Unknown error");
    document.getElementById("stakeAmount").classList.add("error");
  }
}
async function claimReward() {
  if (!stakingContract || !account) {
    document.getElementById("claimStakeStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าก่อน";
    return;
  }

  document.getElementById("claimStakeStatus").innerText = "กำลังดำเนินการเคลมรางวัล Stake...";
  document.getElementById("claimStakeStatus").classList.remove("error", "success");

  try {
    const lastClaimTime = await stakingContract.methods.lastClaim(account).call();
    const claimInterval = await stakingContract.methods.CLAIM_INTERVAL().call();
    const now = Math.floor(Date.now() / 1000);
    const nextClaimTime = Number(lastClaimTime) + Number(claimInterval);

    if (now >= nextClaimTime) {
      const tx = await stakingContract.methods.claimStakingReward().send({ from: account });
      const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);

      if (receipt && receipt.status) {
        alert("🎉 เคลมรางวัล Stake สำเร็จแล้ว!");
        document.getElementById("claimStakeStatus").innerText = "🎉 เคลมรางวัล Stake สำเร็จแล้ว!";
        document.getElementById("claimStakeStatus").classList.add("success");
        loadStakingInfo();
      } else {
        alert("❌ การเคลมไม่สำเร็จ");
        document.getElementById("claimStakeStatus").innerText = "❌ การเคลมล้มเหลว!";
        document.getElementById("claimStakeStatus").classList.add("error");
      }
    } else {
      const remainingSeconds = nextClaimTime - now;
      const waitMinutes = Math.ceil(remainingSeconds / 60);
      const waitHours = Math.floor(waitMinutes / 60);
      const remainingMins = waitMinutes % 60;
      let waitString = "";
      if (waitHours > 0) waitString += `${waitHours} ชั่วโมง `;
      if (remainingMins > 0 || waitHours === 0) waitString += `${remainingMins} นาที`;
      document.getElementById("claimStakeStatus").innerText = `⏳ ต้องรออีก ${waitString}`;
    }
  } catch (e) {
    console.error("claimReward: Error:", e);
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("claimStakeStatus").innerText = `❌ เกิดข้อผิดพลาด: ${errorMessage}`;
    document.getElementById("claimStakeStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการเคลมรางวัล: ${errorMessage}`);
  }
}
async function loadReferralInfo() {
  if (!stakingContract || !account || typeof kjcDecimals === 'undefined') {
    document.getElementById("referralRewardAmount").innerText = "⚠️ กำลังโหลดข้อมูล...";
    console.warn("loadReferralInfo: Contracts or decimals not initialized.");
    return;
  }

  try {
    const rawReferralAmount = await stakingContract.methods.referralReward(account).call();
    const displayReferral = displayWeiToToken(rawReferralAmount, kjcDecimals);

    document.getElementById("referralRewardAmount").innerHTML = `
      💰 จำนวนค่าแนะนำที่เคลมได้: ${displayReferral} KJC
    `;
    console.log("loadReferralInfo: Referral info loaded successfully.");
  } catch (e) {
    console.error("loadReferralInfo: Error:", e);
    document.getElementById("referralRewardAmount").innerText =
      "❌ โหลดค่าแนะนำไม่สำเร็จ: " + (e.message || "Unknown error");
    document.getElementById("referralRewardAmount").classList.add("error");
  }
}
async function claimReferralReward() {
  if (!stakingContract || !account) {
    document.getElementById("referralClaimStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าก่อน";
    return;
  }

  document.getElementById("referralClaimStatus").innerText = "กำลังดำเนินการเคลมรางวัลค่าแนะนำ...";
  document.getElementById("referralClaimStatus").classList.remove("error", "success");

  try {
    const rawClaimable = await stakingContract.methods.referralReward(account).call();
    if (BigInt(rawClaimable) === BigInt(0)) {
      alert("✅ ไม่มีรางวัลค่าแนะนำให้เคลม");
      document.getElementById("referralClaimStatus").innerText = "ไม่มีรางวัลค่าแนะนำ";
      document.getElementById("referralClaimStatus").classList.add("success");
      return;
    }

    const tx = await stakingContract.methods.claimReferralReward().send({ from: account });
    console.log("claimReferralReward: Tx Hash:", tx.transactionHash);

    document.getElementById("referralClaimStatus").innerText = "กำลังรอการยืนยันการเคลมค่าแนะนำ...";
    const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);

    if (receipt && receipt.status) {
      alert("🎉 เคลมรางวัลค่าแนะนำสำเร็จแล้ว!");
      document.getElementById("referralClaimStatus").innerText = "🎉 เคลมรางวัลค่าแนะนำสำเร็จแล้ว!";
      document.getElementById("referralClaimStatus").classList.add("success");
      loadReferralInfo();
      loadStakingInfo();
    } else {
      alert("❌ การเคลมรางวัลค่าแนะนำไม่สำเร็จ หรือธุรกรรมถูกปฏิเสธ");
      document.getElementById("referralClaimStatus").innerText = "❌ การเคลมล้มเหลว!";
      document.getElementById("referralClaimStatus").classList.add("error");
    }
  } catch (e) {
    console.error("claimReferralReward: Error:", e);
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("referralClaimStatus").innerText = `❌ เกิดข้อผิดพลาด: ${errorMessage}`;
    document.getElementById("referralClaimStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการเคลมรางวัล: ${errorMessage}`);
  }
}
function getFriendlyErrorMessage(error) {
  let errorMessage = "Unknown error occurred.";
  if (error.message) {
    errorMessage = error.message;
    if (errorMessage.includes("User denied transaction signature")) {
      errorMessage = "ผู้ใช้ยกเลิกธุรกรรม";
    } else if (errorMessage.includes("execution reverted")) {
      const match = errorMessage.match(/revert: (.*?)(?=[,}]|$)/);
      errorMessage = match && match[1]
        ? `ธุรกรรมล้มเหลว: ${match[1].trim()}`
        : "ธุรกรรมล้มเหลวบน Smart Contract (อาจเกิดจาก Slippage หรือเงื่อนไขอื่นๆ)";
    } else if (errorMessage.includes("gas required exceeds allowance")) {
      errorMessage = "Gas ไม่เพียงพอ หรือ Gas Limit ต่ำเกินไป";
    } else if (errorMessage.includes("insufficient funds for gas")) {
      errorMessage = "ยอด BNB ในกระเป๋าไม่พอสำหรับค่า Gas";
    } else if (errorMessage.includes("Transaction was not mined within")) {
      errorMessage = "ธุรกรรมรอนานเกินไป (อาจต้องเพิ่ม Gas Price หรือเครือข่ายหนาแน่น)";
    }
  } else if (error.code) {
    if (error.code === 4001) errorMessage = "ผู้ใช้ยกเลิกธุรกรรม";
    else if (error.code === -32000) errorMessage = "RPC Error: " + (error.message || "โปรดลองใหม่ภายหลัง");
  }
  return errorMessage;
}
window.addEventListener('load', () => {
  console.log("Window loaded. Attaching event listeners.");
  getReferrerFromURL();

  document.getElementById("connectWalletBtn")?.addEventListener('click', connectWallet);
  document.getElementById("copyRefLinkBtn")?.addEventListener('click', copyRefLink);
  document.getElementById("registerReferrerBtn")?.addEventListener('click', registerReferrer);
  document.getElementById("buyTokenBtn")?.addEventListener('click', buyToken);
  document.getElementById("claimStakeRewardBtn")?.addEventListener('click', claimReward);
  document.getElementById("claimReferralRewardBtn")?.addEventListener('click', claimReferralReward);
});
