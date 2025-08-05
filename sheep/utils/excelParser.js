import * as XLSX from 'xlsx';

/**
 * Excel解析工具
 * 用于解析股指报价表和期权报价表
 */

/**
 * 解析股指报价表
 * @param {ArrayBuffer} fileData - Excel文件的ArrayBuffer数据
 * @returns {Array} 解析后的股指数据
 */
export const parseStockIndexExcel = (fileData) => {
  try {
    console.log('开始解析股指报价表，数据类型:', typeof fileData);
    console.log('数据长度:', fileData.length || fileData.byteLength);
    
    // 检查数据有效性
    if (!fileData || fileData.length === 0) {
      throw new Error('Excel文件数据为空');
    }
    
    // 尝试读取Excel文件
    let workbook;
    try {
      workbook = XLSX.read(fileData, { type: 'array' });
      console.log('Excel读取成功，工作表数量:', workbook.SheetNames.length);
    } catch (readError) {
      console.error('Excel读取失败:', readError);
      throw new Error(`Excel读取失败: ${readError.message}`);
    }
    
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel文件不包含任何工作表');
    }
    
    const firstSheetName = workbook.SheetNames[0];
    console.log('使用第一个工作表:', firstSheetName);
    
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new Error(`无法获取工作表: ${firstSheetName}`);
    }
    
    // 将Excel转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log('转换为JSON数据，行数:', jsonData.length);
    
    if (jsonData.length === 0) {
      throw new Error('Excel文件不包含有效数据');
    }
    
    // 输出第一行数据的字段，帮助调试
    console.log('第一行数据字段:', Object.keys(jsonData[0]));
    
    // 提取股指数据
    const stockIndexData = jsonData.map((row, index) => {
      try {
        // 根据实际Excel结构调整字段名
        return {
          code: row['代码'] || row['股指代码'] || '',
          name: row['名称'] || row['股指名称'] || '',
          price: parseFloat(row['最新价'] || row['收盘价'] || 0),
          change: parseFloat(row['涨跌'] || row['涨跌额'] || 0),
          changePercent: parseFloat(row['涨跌幅'] || row['涨跌幅(%)'] || 0),
          open: parseFloat(row['开盘价'] || 0),
          high: parseFloat(row['最高价'] || 0),
          low: parseFloat(row['最低价'] || 0),
          volume: parseFloat(row['成交量'] || 0),
          turnover: parseFloat(row['成交额'] || 0),
          date: row['日期'] || new Date().toISOString().split('T')[0]
        };
      } catch (rowError) {
        console.error(`解析第${index+1}行数据出错:`, rowError);
        // 返回空对象，后续会被过滤掉
        return {};
      }
    }).filter(item => item.code && item.name); // 过滤掉无效数据
    
    console.log(`解析完成，有效数据: ${stockIndexData.length}/${jsonData.length}`);
    
    return stockIndexData;
  } catch (error) {
    console.error('解析股指报价表出错:', error);
    throw error; // 重新抛出错误以便上层捕获
  }
};

/**
 * 解析期权报价表
 * @param {ArrayBuffer} fileData - Excel文件的ArrayBuffer数据
 * @returns {Object} 解析后的期权数据，按标的分组
 */
export const parseOptionsExcel = (fileData) => {
  try {
    console.log('开始解析期权报价表，数据类型:', typeof fileData);
    console.log('数据长度:', fileData.length || fileData.byteLength);
    
    // 检查数据有效性
    if (!fileData || fileData.length === 0) {
      throw new Error('Excel文件数据为空');
    }
    
    // 尝试读取Excel文件
    let workbook;
    try {
      workbook = XLSX.read(fileData, { type: 'array' });
      console.log('Excel读取成功，工作表数量:', workbook.SheetNames.length);
    } catch (readError) {
      console.error('Excel读取失败:', readError);
      throw new Error(`Excel读取失败: ${readError.message}`);
    }
    
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel文件不包含任何工作表');
    }
    
    const firstSheetName = workbook.SheetNames[0];
    console.log('使用第一个工作表:', firstSheetName);
    
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new Error(`无法获取工作表: ${firstSheetName}`);
    }
    
    // 将Excel转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log('转换为JSON数据，行数:', jsonData.length);
    
    if (jsonData.length === 0) {
      throw new Error('Excel文件不包含有效数据');
    }
    
    // 输出第一行数据的字段，帮助调试
    console.log('第一行数据字段:', Object.keys(jsonData[0]));
    
    // 按标的分组的期权数据
    const optionsData = {};
    let validRows = 0;
    
    jsonData.forEach((row, index) => {
      try {
        // 提取标的代码
        const underlyingCode = row['标的代码'] || row['标的物代码'] || '';
        if (!underlyingCode) {
          console.warn(`第${index+1}行缺少标的代码，跳过`);
          return;
        }
        
        // 初始化标的数据结构
        if (!optionsData[underlyingCode]) {
          optionsData[underlyingCode] = {
            callOptions: [],
            putOptions: []
          };
        }
        
        // 构建期权数据对象
        const optionData = {
          code: row['期权代码'] || '',
          name: row['期权名称'] || '',
          strikePrice: parseFloat(row['行权价'] || row['执行价'] || 0),
          expiryDate: row['到期日'] || '',
          price: parseFloat(row['最新价'] || row['收盘价'] || 0),
          change: parseFloat(row['涨跌'] || row['涨跌额'] || 0),
          changePercent: parseFloat(row['涨跌幅'] || row['涨跌幅(%)'] || 0),
          volume: parseFloat(row['成交量'] || 0),
          openInterest: parseFloat(row['持仓量'] || 0),
          impliedVolatility: parseFloat(row['隐含波动率'] || row['IV'] || 0),
          delta: parseFloat(row['Delta'] || 0),
          gamma: parseFloat(row['Gamma'] || 0),
          theta: parseFloat(row['Theta'] || 0),
          vega: parseFloat(row['Vega'] || 0)
        };
        
        // 根据期权类型分类
        const optionType = row['期权类型'] || row['类型'] || '';
        if (optionType.includes('认购') || optionType.toLowerCase().includes('call')) {
          optionsData[underlyingCode].callOptions.push(optionData);
          validRows++;
        } else if (optionType.includes('认沽') || optionType.toLowerCase().includes('put')) {
          optionsData[underlyingCode].putOptions.push(optionData);
          validRows++;
        } else {
          console.warn(`第${index+1}行期权类型未知: ${optionType}`);
        }
      } catch (rowError) {
        console.error(`解析第${index+1}行期权数据出错:`, rowError);
      }
    });
    
    // 检查是否有有效数据
    const underlyings = Object.keys(optionsData);
    if (underlyings.length === 0) {
      throw new Error('未找到任何有效的期权数据');
    }
    
    console.log(`解析完成，有效数据: ${validRows}/${jsonData.length}，标的数量: ${underlyings.length}`);
    
    return optionsData;
  } catch (error) {
    console.error('解析期权报价表出错:', error);
    throw error; // 重新抛出错误以便上层捕获
  }
};

/**
 * 根据标的代码、期权类型和行权价查询期权价格
 * @param {Object} optionsData - 期权数据对象
 * @param {String} underlyingCode - 标的代码
 * @param {String} optionType - 期权类型 ('call' 或 'put')
 * @param {Number} strikePrice - 行权价
 * @param {String} expiryDate - 到期日 (可选)
 * @returns {Object|null} 匹配的期权数据或null
 */
export const findOptionPrice = (optionsData, underlyingCode, optionType, strikePrice, expiryDate = null) => {
  // 检查标的是否存在
  if (!optionsData[underlyingCode]) {
    return null;
  }
  
  // 根据期权类型选择数据集
  const options = optionType === 'call' 
    ? optionsData[underlyingCode].callOptions 
    : optionsData[underlyingCode].putOptions;
  
  // 查找最接近的期权
  let closestOption = null;
  let minDiff = Infinity;
  
  options.forEach(option => {
    // 如果指定了到期日，则需要匹配到期日
    if (expiryDate && option.expiryDate !== expiryDate) {
      return;
    }
    
    // 计算行权价差异
    const diff = Math.abs(option.strikePrice - strikePrice);
    
    // 更新最接近的期权
    if (diff < minDiff) {
      minDiff = diff;
      closestOption = option;
    }
  });
  
  return closestOption;
};

/**
 * 使用Black-Scholes模型计算期权价格
 * @param {String} optionType - 期权类型 ('call' 或 'put')
 * @param {Number} S - 标的价格
 * @param {Number} K - 行权价格
 * @param {Number} T - 到期时间(年)
 * @param {Number} r - 无风险利率
 * @param {Number} sigma - 波动率
 * @returns {Object} 期权价格和希腊字母
 */
export const calculateOptionPrice = (optionType, S, K, T, r, sigma) => {
  // 标准正态分布累积分布函数
  const normalCDF = (x) => {
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
  };
  
  // 标准正态分布概率密度函数
  const normalPDF = (x) => {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  };
  
  // 计算d1和d2
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  let price, delta, gamma, theta, vega;
  
  // 根据期权类型计算价格和希腊字母
  if (optionType === 'call') {
    // 看涨期权
    price = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
    delta = normalCDF(d1);
    theta = (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365;
  } else {
    // 看跌期权
    price = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    delta = normalCDF(d1) - 1;
    theta = (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
  }
  
  // 共同的希腊字母
  gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T));
  vega = S * Math.sqrt(T) * normalPDF(d1) / 100; // 除以100是为了表示为每1%波动率变化的价格变化
  
  return {
    price: price.toFixed(4),
    delta: delta.toFixed(4),
    gamma: gamma.toFixed(4),
    theta: theta.toFixed(4),
    vega: vega.toFixed(4)
  };
};

/**
 * 从Excel数据中提取期权询价结果
 * @param {Array} stockIndexData - 股指期权数据
 * @param {Object} stockOptionsData - 个股期权数据
 * @param {Object} params - 询价参数
 * @returns {Object} 期权询价结果
 */
export const extractOptionInquiryFromExcel = (stockIndexData, stockOptionsData, params) => {
  const { stockCode, optionType, term, structureType, strikePriceRatio, strikePrice, expiryDate } = params;

  try {
    // 1. 查找股票信息
    const stockInfo = stockIndexData.find(stock => stock.code === stockCode);
    if (!stockInfo) {
      throw new Error(`未找到股票代码 ${stockCode} 的信息`);
    }

    // 2. 计算实际行权价格
    let actualStrikePrice = strikePrice;
    if (structureType !== 'custom' && strikePriceRatio) {
      actualStrikePrice = stockInfo.price * (strikePriceRatio / 100);
    }

    // 3. 计算到期日
    let actualExpiryDate = expiryDate;
    if (structureType !== 'custom' && term) {
      actualExpiryDate = calculateExpiryDate(term);
    }

    // 4. 从期权数据中查找匹配的期权
    const option = findOptionPrice(stockOptionsData, stockCode, optionType, actualStrikePrice, actualExpiryDate);

    let result = {
      stockCode: stockCode,
      stockName: stockInfo.name,
      optionType: optionType,
      term: term,
      strikePrice: actualStrikePrice,
      strikePriceRatio: strikePriceRatio,
      expiryDate: actualExpiryDate,
      currentPrice: stockInfo.price,
      lastPrice: 0,
      bidPrice: 0,
      askPrice: 0,
      impliedVolatility: '0%',
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      volume: 0,
      openInterest: 0,
      quoteTime: new Date().toISOString(),
      quoteSource: '系统计算',
      brokerQuotes: []
    };

    if (option) {
      // 如果找到匹配的期权，使用实际数据
      result.lastPrice = option.price;
      result.bidPrice = option.price * 0.95; // 模拟买入价
      result.askPrice = option.price * 1.05; // 模拟卖出价
      result.impliedVolatility = (option.impliedVolatility * 100).toFixed(1) + '%';
      result.delta = option.delta;
      result.gamma = option.gamma;
      result.theta = option.theta;
      result.vega = option.vega;
      result.volume = option.volume;
      result.openInterest = option.openInterest;
      result.quoteSource = '期权报价表';
    } else {
      // 如果没有找到匹配的期权，使用Black-Scholes模型计算
      const timeToExpiry = calculateTimeToExpiry(actualExpiryDate);
      const calculatedResult = calculateOptionPrice(
        optionType,
        stockInfo.price,
        actualStrikePrice,
        timeToExpiry,
        0.03, // 默认无风险利率3%
        0.3   // 默认波动率30%
      );

      result.lastPrice = parseFloat(calculatedResult.price);
      result.bidPrice = result.lastPrice * 0.95;
      result.askPrice = result.lastPrice * 1.05;
      result.impliedVolatility = '30.0%';
      result.delta = parseFloat(calculatedResult.delta);
      result.gamma = parseFloat(calculatedResult.gamma);
      result.theta = parseFloat(calculatedResult.theta);
      result.vega = parseFloat(calculatedResult.vega);
      result.quoteSource = 'Black-Scholes模型';
    }

    return result;
  } catch (error) {
    console.error('提取期权询价结果失败:', error);
    throw error;
  }
};

/**
 * 根据期限计算到期日
 * @param {String} term - 期限 (2W/1M/2M/3M/6M/12M)
 * @returns {String} 到期日期字符串
 */
const calculateExpiryDate = (term) => {
  const today = new Date();
  let expiryDate = new Date(today);

  switch (term) {
    case '2W':
      expiryDate.setDate(today.getDate() + 14);
      break;
    case '1M':
      expiryDate.setMonth(today.getMonth() + 1);
      break;
    case '2M':
      expiryDate.setMonth(today.getMonth() + 2);
      break;
    case '3M':
      expiryDate.setMonth(today.getMonth() + 3);
      break;
    case '6M':
      expiryDate.setMonth(today.getMonth() + 6);
      break;
    case '12M':
      expiryDate.setFullYear(today.getFullYear() + 1);
      break;
    default:
      expiryDate.setMonth(today.getMonth() + 1);
  }

  return expiryDate.toISOString().split('T')[0];
};

/**
 * 计算到期时间（年）
 * @param {String} expiryDate - 到期日期字符串
 * @returns {Number} 到期时间（年）
 */
const calculateTimeToExpiry = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return (expiry - today) / (365 * 24 * 60 * 60 * 1000);
};

export default {
  parseStockIndexExcel,
  parseOptionsExcel,
  findOptionPrice,
  calculateOptionPrice,
  extractOptionInquiryFromExcel
};