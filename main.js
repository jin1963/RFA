let web3;
let account;
let stakingContract;

async function connectWallet() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];

      document.getElementById("walletAddress").innerText = `✅ ${account}`;
      document.getElementById("stakeSection").style.display = "block";

      stakingContract = new web3.eth.Contract(stakingABI, contractAddress);

      loadStakingInfo();
    } catch (err) {
      console.error("User rejected connection", err);
    }
  } else {
    alert("กรุณาติดตั้ง MetaMask หรือ Bitget Wallet");
  }
}

async function loadStakingInfo() {
  if (!stakingContract || !account) return;
  try {
    const stake = await stakingContract.methods.getStakeInfo(account).call();
    document.getElementById("stakeAmount").innerText = `${web3.utils.fromWei(stake[0], 'ether')} KJC`;
  } catch (e) {
    document.getElementById("stakeAmount").innerText = "โหลดข้อมูลไม่ได้";
    console.error(e);
  }
}

async function claimReward() {
  if (!stakingContract || !account) {
    document.getElementById("claimStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าก่อน";
    return;
  }

  try {
    const last = await stakingContract.methods.lastClaimed(account).call();
    const interval = await stakingContract.methods.CLAIM_INTERVAL().call();
    const now = Math.floor(Date.now() / 1000);

    if (now >= parseInt(last) + parseInt(interval)) {
      await stakingContract.methods.claimStakingReward().send({ from: account });
      document.getElementById("claimStatus").innerText = "🎉 คุณเคลมรางวัลสำเร็จแล้ว!";
      loadStakingInfo();
    } else {
      const remaining = parseInt(last) + parseInt(interval) - now;
      const min = Math.ceil(remaining / 60);
      document.getElementById("claimStatus").innerText = `⏳ ต้องรออีก ${min} นาทีจึงจะเคลมได้`;
    }
  } catch (e) {
    document.getElementById("claimStatus").innerText = "❌ เกิดข้อผิดพลาดในการเคลมรางวัล";
    console.error(e);
  }
}
