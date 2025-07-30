let web3;
let account;
let stakingContract;
let usdtContract;
let routerContract;
let kjcContract;
let usdtDecimals;
let kjcDecimals;

const contractAddress = "0xC444F117806B725E12154Fa7D0cd090Eec325B48";
const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
const kjcAddress = "0xd479ae350dc24168e8db863c5413c35fb2044ecd";
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const BSC_CHAIN_ID = '0x38';

// PancakeSwap Router Minimal ABI
const ROUTER_ABI_MINIMAL = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" }
    ],
    "name": "getAmountsOut",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ERC20 Minimal ABI
const ERC20_ABI_MINIMAL = [
  { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "constant": false, "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "constant": true, "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];
// แปลงจาก wei → token string (แสดงผล)
function displayWeiToToken(weiAmount, decimals) {
  if (!web3 || !weiAmount || typeof decimals === 'undefined' || isNaN(decimals)) return '0';
  try {
    const divisor = BigInt(10) ** BigInt(decimals);
    if (BigInt(weiAmount) === BigInt(0)) return '0';
    let amountStr = BigInt(weiAmount).toString();
    if (amountStr.length <= decimals) {
      amountStr = '0.' + '0'.repeat(decimals - amountStr.length) + amountStr;
    } else {
      amountStr = amountStr.slice(0, amountStr.length - decimals) + '.' + amountStr.slice(amountStr.length - decimals);
    }
    return amountStr.replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
  } catch (e) {
    return (parseFloat(weiAmount.toString()) / (10 ** decimals)).toString();
  }
}

// แปลงจาก token → wei string (ส่งธุรกรรม)
function tokenToWei(tokenAmount, decimals) {
  if (!web3 || !tokenAmount || typeof decimals === 'undefined' || isNaN(decimals)) return '0';
  try {
    const [integer, fractional] = tokenAmount.toString().split('.');
    let weiAmount = BigInt(integer || '0') * (BigInt(10) ** BigInt(decimals));
    if (fractional) {
      const paddedFractional = (fractional + '0'.repeat(decimals)).slice(0, decimals);
      weiAmount += BigInt(paddedFractional);
    }
    return weiAmount.toString();
  } catch (e) {
    return web3.utils.toWei(tokenAmount.toString(), 'ether');
  }
}
async function connectWallet() {
  console.log("connectWallet: Function started.");
  document.getElementById("walletAddress").innerText = `กำลังเชื่อมต่อ...`;
  document.getElementById("walletAddress").classList.remove("success", "error");

  if (typeof window.ethereum === 'undefined') {
    alert("กรุณาติดตั้ง MetaMask หรือ Bitget Wallet หรือเปิด DApp ผ่าน Browser ใน Wallet App");
    document.getElementById("walletAddress").innerText = `❌ ไม่พบ Wallet Extension`;
    document.getElementById("walletAddress").classList.add("error");
    return;
  }

  try {
    web3 = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    account = accounts[0];

    const currentChainId = await web3.eth.getChainId();
    const currentChainIdHex = web3.utils.toHex(currentChainId);
    const expectedChainId = '0x38';

    if (currentChainIdHex !== expectedChainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainId }],
        });
        const newAccounts = await web3.eth.getAccounts();
        account = newAccounts[0];
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: expectedChainId,
                chainName: 'BNB Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/']
              }],
            });
            const newAccounts = await web3.eth.getAccounts();
            account = newAccounts[0];
          } catch (addError) {
            alert("❌ กรุณาเพิ่ม Binance Smart Chain ด้วยตนเอง");
            document.getElementById("walletAddress").innerText = `❌ การเชื่อมต่อล้มเหลว`;
            document.getElementById("walletAddress").classList.add("error");
            return;
          }
        } else {
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
      typeof stakingABI === 'undefined' || typeof usdtABI === 'undefined' ||
      typeof contractAddress === 'undefined' || typeof kjcAddress === 'undefined' ||
      typeof usdtAddress === 'undefined' || typeof routerAddress === 'undefined'
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
  } catch (e) {
    const errorMessage = getFriendlyErrorMessage(e);
    alert("❌ การเชื่อมต่อล้มเหลว: " + errorMessage);
    document.getElementById("walletAddress").innerText = `❌ การเชื่อมต่อล้มเหลว`;
    document.getElementById("walletAddress").classList.add("error");
  }
}
// อ่านจำนวนทศนิยมจาก token contract หากอ่านไม่สำเร็จให้ใช้ default
async function getTokenDecimals(tokenContract, fallback = 18) {
  try {
    const decimals = await tokenContract.methods.decimals().call();
    return parseInt(decimals);
  } catch (e) {
    console.warn("getTokenDecimals fallback:", e);
    return fallback;
  }
}

// แปลข้อผิดพลาดให้อ่านง่าย
function getFriendlyErrorMessage(error) {
  if (typeof error === 'string') return error;
  if (error?.message) {
    if (error.message.includes("user rejected transaction")) return "ผู้ใช้ยกเลิกธุรกรรม";
    return error.message;
  }
  return "ไม่ทราบสาเหตุ";
}
// แสดงลิงก์แนะนำของผู้ใช้
function generateReferralLink() {
  if (!account) {
    document.getElementById("refLink").value = "โปรดเชื่อมต่อกระเป๋าเพื่อสร้างลิงก์";
    return;
  }
  const link = `${window.location.origin}${window.location.pathname}?ref=${account}`;
  document.getElementById("refLink").value = link;
}

// คัดลอกลิงก์แนะนำ
function copyRefLink() {
  const input = document.getElementById("refLink");
  input.select();
  input.setSelectionRange(0, 99999); // บางเบราว์เซอร์ต้องใช้
  navigator.clipboard.writeText(input.value);
  alert("✅ คัดลอกลิงก์เรียบร้อยแล้ว!");
}

// ตรวจ referrer address จาก URL และแสดงผลในช่องกรอก
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

// สมัคร Referrer ผ่าน smart contract
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
    } else {
      document.getElementById("registerStatus").innerText = "❌ การสมัคร Referrer ไม่สำเร็จ หรือธุรกรรมถูกปฏิเสธ";
      document.getElementById("registerStatus").classList.add("error");
    }
  } catch (e) {
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("registerStatus").innerText = `❌ เกิดข้อผิดพลาด: ${errorMessage}`;
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
      alert("❌ การซื้อไม่สำเร็จ หรือธุรกรรมถูกปฏิเสธ");
      document.getElementById("buyTokenStatus").innerText = "❌ การซื้อ KJC ไม่สำเร็จ!";
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
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("referralClaimStatus").innerText = `❌ เกิดข้อผิดพลาด: ${errorMessage}`;
    document.getElementById("referralClaimStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการเคลมรางวัล: ${errorMessage}`);
  }
}
async function updateStakeInfo() {
  if (!stakingContract || !account) return;

  try {
    // อ่านยอดที่ stake
    const stake = await stakingContract.methods.stakedAmount(account).call();
    const stakeInEther = web3.utils.fromWei(stake, 'ether');
    document.getElementById("yourStake").innerText = `💰 Your Stake: ${stakeInEther} KJC`;

    // อ่าน reward ที่ claim ได้จาก staking
    const stakingReward = await stakingContract.methods.stakingRewards(account).call();
    const rewardInEther = web3.utils.fromWei(stakingReward, 'ether');
    document.getElementById("yourStakingReward").innerText = `🎉 Claimable Stake Reward: ${rewardInEther} KJC`;

    // อ่าน reward ที่ claim ได้จาก referral
    const referralReward = await stakingContract.methods.referralRewards(account).call();
    const referralInEther = web3.utils.fromWei(referralReward, 'ether');
    document.getElementById("yourReferralReward").innerText = `👥 Claimable Referral Reward: ${referralInEther} KJC`;

  } catch (error) {
    console.error("❌ Error updating stake info:", error);
  }
}
function checkReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  if (ref && web3.utils.isAddress(ref)) {
    localStorage.setItem('referrer', ref);
    document.getElementById("refAddress").value = ref;
  }
}
async function buyAndStake() {
  const usdtAmountInput = document.getElementById("usdtAmount").value;
  if (!usdtAmountInput || isNaN(usdtAmountInput) || Number(usdtAmountInput) <= 0) {
    alert("❌ กรุณากรอกจำนวน USDT ที่จะใช้ซื้อ");
    return;
  }

  const usdtAmount = web3.utils.toWei(usdtAmountInput, 'ether');

  try {
    await usdtContract.methods.approve(contractAddress, usdtAmount).send({ from: account });

    const amounts = await routerContract.methods.getAmountsOut(usdtAmount, [usdtAddress, kjcAddress]).call();
    const estimatedKJC = amounts[1];
    const amountOutMin = BigInt(estimatedKJC) * 98n / 100n; // 2% slippage

    await stakingContract.methods.buyAndStake(usdtAmount, amountOutMin.toString()).send({ from: account });

    alert("✅ ซื้อและ Stake KJC สำเร็จ!");
    updateStakeInfo();
  } catch (error) {
    console.error("❌ Error in buyAndStake:", error);
    alert("❌ ไม่สามารถทำการซื้อและ Stake ได้");
  }
}

async function claimStakingReward() {
  try {
    await stakingContract.methods.claimStakingReward().send({ from: account });
    alert("✅ เคลมรางวัลจากการ Stake สำเร็จ!");
    updateStakeInfo();
  } catch (error) {
    console.error("❌ Error claiming staking reward:", error);
    alert("❌ ยังไม่ถึงเวลาหรือเคลมไม่ได้");
  }
}

async function claimReferralReward() {
  try {
    await stakingContract.methods.claimReferralReward().send({ from: account });
    alert("✅ เคลมรางวัลจาก Referral สำเร็จ!");
    updateStakeInfo();
  } catch (error) {
    console.error("❌ Error claiming referral reward:", error);
    alert("❌ ยังไม่ถึงเวลาหรือเคลมไม่ได้");
  }
}
// เรียกเมื่อโหลดหน้าเว็บ
window.addEventListener('load', () => {
  checkReferral();
});

// เรียกเมื่อเชื่อมกระเป๋าสำเร็จ
async function onWalletConnected() {
  usdtContract = new web3.eth.Contract(usdtABI, usdtAddress);
  stakingContract = new web3.eth.Contract(stakingABI, contractAddress);
  routerContract = new web3.eth.Contract(routerABI, routerAddress);

  showReferralLink();
  updateStakeInfo();
}
