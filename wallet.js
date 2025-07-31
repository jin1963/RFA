// js/wallet.js
import { contractAddress, usdtAddress, kjcAddress, routerAddress, stakingABI, usdtABI } from '../config.js';
import { getTokenDecimals, getFriendlyErrorMessage } from './utils.js';
import { updateUI } from './app.js'; // จะใช้เรียกเมื่อเชื่อมต่อสำเร็จ

// PancakeSwap Router Minimal ABI (ยังคงเก็บไว้ในนี้ถ้าไม่ใช้ routerABI จาก config.js)
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

// ERC20 Minimal ABI (ถ้าไม่ได้ใช้ usdtABI จาก config.js ที่มีอยู่แล้ว)
// แต่ในกรณีนี้เราใช้ usdtABI จาก config.js ซึ่งครบถ้วนกว่า
const ERC20_ABI_MINIMAL = [
  { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "constant": false, "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "constant": true, "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];


export async function connectWallet() {
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
    // กำหนดตัวแปร global ที่จะใช้ร่วมกัน
    window.web3 = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    window.account = accounts[0]; // ทำให้ account เป็น global

    const currentChainId = await window.web3.eth.getChainId();
    const currentChainIdHex = window.web3.utils.toHex(currentChainId);
    const expectedChainId = '0x38'; // BSC Mainnet

    if (currentChainIdHex !== expectedChainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainId }],
        });
        // เมื่อสลับเชนสำเร็จ อาจจะต้องเรียก getAccounts อีกครั้งเพื่อยืนยัน
        const newAccounts = await window.web3.eth.getAccounts();
        window.account = newAccounts[0];
      } catch (switchError) {
        if (switchError.code === 4902) { // 4902: Chain hasn't been added to wallet
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
            const newAccounts = await window.web3.eth.getAccounts();
            window.account = newAccounts[0];
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

    document.getElementById("walletAddress").innerText = `✅ ${window.account.substring(0, 6)}...${window.account.substring(window.account.length - 4)}`;
    document.getElementById("walletAddress").classList.add("success");

    // ตรวจสอบว่า ABI และ Address ถูกโหลดมาอย่างถูกต้องจาก config.js
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

    // กำหนด Contract Instances ให้เป็น global
    window.stakingContract = new window.web3.eth.Contract(stakingABI, contractAddress);
    window.routerContract = new window.web3.eth.Contract(ROUTER_ABI_MINIMAL, routerAddress);
    window.usdtContract = new window.web3.eth.Contract(usdtABI, usdtAddress);
    window.kjcContract = new window.web3.eth.Contract(ERC20_ABI_MINIMAL, kjcAddress); // kjcContract ใช้ ERC20_ABI_MINIMAL

    // กำหนด Decimals ให้เป็น global
    window.usdtDecimals = await getTokenDecimals(window.usdtContract, 18);
    window.kjcDecimals = await getTokenDecimals(window.kjcContract, 18);

    // เรียกฟังก์ชัน updateUI ใน app.js เพื่ออัปเดตข้อมูลทั้งหมด
    updateUI();

  } catch (e) {
    const errorMessage = getFriendlyErrorMessage(e);
    alert("❌ การเชื่อมต่อล้มเหลว: " + errorMessage);
    document.getElementById("walletAddress").innerText = `❌ การเชื่อมต่อล้มเหลว`;
    document.getElementById("walletAddress").classList.add("error");
  }
}
