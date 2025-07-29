let web3;
let account;
let contract;
let usdtContract;

const contractAddress = "0xC444F117806B725E12154Fa7D0cd090Eec325B48";
const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
const kjcAddress = "0xd479ae350dc24168e8db863c5413c35fb2044ecd";

// ✅ ข้อมูล BSC Chain
const BSC_PARAMS = {
  chainId: '0x38', // 56 ใน hex
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com']
};

// ✅ ฟังก์ชันเปลี่ยนเป็น BSC Chain
async function switchToBSC() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC_PARAMS.chainId }]
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [BSC_PARAMS]
      });
    } else {
      throw switchError;
    }
  }
}

// ✅ เชื่อมต่อกระเป๋า + สลับ Chain (Bitget / MetaMask ได้)
async function connectWallet() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];
      document.getElementById("walletAddress").innerText = `✅ ${account}`;

      await switchToBSC(); // สลับ chain หลังเชื่อมแล้ว

      contract = new web3.eth.Contract(referralStakerABI, contractAddress);
      usdtContract = new web3.eth.Contract(usdtABI, usdtAddress);

      loadYourStake();
    } catch (error) {
      console.error("❌ เชื่อมต่อผิดพลาด:", error);
      alert("❌ กรุณาอนุญาตการเชื่อมต่อหรือสลับเครือข่าย");
    }
  } else {
    alert("⚠️ กรุณาติดตั้ง MetaMask หรือ Bitget Wallet");
  }
}

// ✅ สมัคร Referrer
async function registerReferrer() {
  const ref = document.getElementById("refAddress").value;
  if (!ref || !web3.utils.isAddress(ref)) {
    alert("❗ กรุณาใส่ Referrer Address ให้ถูกต้อง");
    return;
  }
  try {
    await contract.methods.registerReferrer(ref).send({ from: account });
    alert("✅ สมัคร Referrer สำเร็จ!");
  } catch (err) {
    console.error(err);
    alert("❌ สมัคร Referrer ไม่สำเร็จ");
  }
}

// ✅ ซื้อเหรียญ KJC ด้วย USDT
async function buyKJC() {
  const amount = document.getElementById("usdtAmount").value;
  if (!amount || isNaN(amount)) {
    alert("❗ กรุณาใส่จำนวน USDT ที่ถูกต้อง");
    return;
  }
  try {
    const usdtAmount = web3.utils.toWei(amount, "ether");

    await usdtContract.methods.approve(contractAddress, usdtAmount).send({ from: account });
    await contract.methods.buyWithUSDT(usdtAmount).send({ from: account });

    alert("✅ ซื้อเหรียญ KJC สำเร็จ!");
    loadYourStake();
  } catch (err) {
    console.error(err);
    alert("❌ ซื้อเหรียญ KJC ไม่สำเร็จ");
  }
}

// ✅ โหลดยอด stake
async function loadYourStake() {
  try {
    const stake = await contract.methods.stakedAmount(account).call();
    const readable = web3.utils.fromWei(stake, "ether");
    document.getElementById("yourStake").innerText = `${readable} KJC`;
  } catch (err) {
    console.error(err);
    document.getElementById("yourStake").innerText = "❌ โหลดไม่สำเร็จ";
  }
}

// ✅ เคลมรางวัล
async function claimReward() {
  try {
    await contract.methods.claimReward().send({ from: account });
    alert("✅ เคลมรางวัลสำเร็จ!");
    loadYourStake();
  } catch (err) {
    console.error(err);
    alert("❌ ยังไม่ถึงเวลาเคลมหรือเกิดข้อผิดพลาด");
  }
}
