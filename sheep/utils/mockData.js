/**
 * 模拟数据工具
 * 用于前端开发阶段，模拟后端接口返回数据
 */

// 模拟股票数据
export const mockStocks = [
  {
    code: '600000',
    name: '浦发银行',
    price: 10.25,
    change: 0.35,
    changePercent: 3.54,
    volume: 12560000
  },
  {
    code: '601398',
    name: '工商银行',
    price: 5.67,
    change: -0.12,
    changePercent: -2.07,
    volume: 45670000
  },
  {
    code: '000001',
    name: '平安银行',
    price: 18.76,
    change: 0.56,
    changePercent: 3.08,
    volume: 8970000
  },
  {
    code: '601318',
    name: '中国平安',
    price: 56.89,
    change: -1.23,
    changePercent: -2.12,
    volume: 5670000
  },
  {
    code: '600519',
    name: '贵州茅台',
    price: 1789.56,
    change: 23.45,
    changePercent: 1.33,
    volume: 890000
  }
];

// 模拟期权询价结果
export const mockOptionInquiry = (params) => {
  const { stockCode, currentPrice, optionType, strikePrice, expiryDate, quantity, volatility = 0.3, riskFreeRate = 0.03 } = params;
  
  // 计算到期时间（年）
  const today = new Date();
  const expiry = new Date(expiryDate);
  const timeToExpiry = (expiry - today) / (365 * 24 * 60 * 60 * 1000);
  
  // 简单的Black-Scholes模型计算（仅用于模拟）
  let price, delta, gamma, theta, vega;
  
  if (optionType === 'call') {
    // 看涨期权
    price = calculateCallPrice(currentPrice, strikePrice, timeToExpiry, riskFreeRate, volatility);
    delta = calculateCallDelta(currentPrice, strikePrice, timeToExpiry, riskFreeRate, volatility);
  } else {
    // 看跌期权
    price = calculatePutPrice(currentPrice, strikePrice, timeToExpiry, riskFreeRate, volatility);
    delta = calculatePutDelta(currentPrice, strikePrice, timeToExpiry, riskFreeRate, volatility);
  }
  
  // 计算其他希腊字母
  gamma = calculateGamma(currentPrice, strikePrice, timeToExpiry, riskFreeRate, volatility);
  theta = calculateTheta(currentPrice, strikePrice, timeToExpiry, riskFreeRate, volatility, optionType);
  vega = calculateVega(currentPrice, strikePrice, timeToExpiry, riskFreeRate, volatility);
  
  // 返回结果
  return {
    price: (price * quantity).toFixed(2),
    delta: delta.toFixed(4),
    gamma: gamma.toFixed(4),
    theta: theta.toFixed(4),
    vega: vega.toFixed(4)
  };
};

// 标准正态分布累积分布函数
function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1 + sign * y);
}

// 标准正态分布概率密度函数
function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// 计算看涨期权价格
function calculateCallPrice(S, K, T, r, sigma) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

// 计算看跌期权价格
function calculatePutPrice(S, K, T, r, sigma) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

// 计算看涨期权Delta
function calculateCallDelta(S, K, T, r, sigma) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  
  return normalCDF(d1);
}

// 计算看跌期权Delta
function calculatePutDelta(S, K, T, r, sigma) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  
  return normalCDF(d1) - 1;
}

// 计算Gamma
function calculateGamma(S, K, T, r, sigma) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  
  return normalPDF(d1) / (S * sigma * Math.sqrt(T));
}

// 计算Theta
function calculateTheta(S, K, T, r, sigma, optionType) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  if (optionType === 'call') {
    return (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365;
  } else {
    return (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
  }
}

// 计算Vega
function calculateVega(S, K, T, r, sigma) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  
  return S * Math.sqrt(T) * normalPDF(d1) / 100; // 除以100是为了表示为每1%波动率变化的价格变化
}

export default {
  mockStocks,
  mockOptionInquiry
}; 