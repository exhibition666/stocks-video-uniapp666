import request from '@/sheep/request';
import { mockStocks, mockOptionInquiry } from '@/sheep/utils/mockData';
import { parseStockIndexExcel, parseOptionsExcel, findOptionPrice, calculateOptionPrice, extractOptionInquiryFromExcel } from '@/sheep/utils/excelParser';
import { ossConfigId } from '@/sheep/config';
import * as XLSX from 'xlsx'; // 导入XLSX库

// 存储解析后的数据
let stockIndexData = [];
let optionsData = {};

// 存储STS凭证
let stsTokenCache = {
  token: null,
  expireTime: 0
};

// 确保获取正确的OSS配置ID
const getOssConfigId = () => {
  // 从环境变量获取OSS配置ID，优先使用MAIN配置
  const envConfigIdMain = import.meta.env.SHOPRO_OSS_CONFIG_ID_MAIN;
  const envConfigId = import.meta.env.SHOPRO_OSS_CONFIG_ID;

  // 优先使用MAIN配置
  if (envConfigIdMain) {
    console.log('使用环境变量SHOPRO_OSS_CONFIG_ID_MAIN:', envConfigIdMain);
    return parseInt(envConfigIdMain);
  }

  // 如果MAIN配置不存在，使用普通配置
  if (envConfigId) {
    console.log('使用环境变量SHOPRO_OSS_CONFIG_ID:', envConfigId);
    return parseInt(envConfigId);
  }

  // 否则使用固定值31
  console.log('环境变量未设置，使用默认值31');
  return 31;
};

// 构建OSS直接访问URL
const constructOssUrl = (file) => {
  try {
    // 从文件路径中提取信息
    const filePath = file.path || '';
    if (!filePath) return null;
    
    // 检查是否已经是完整的URL
    if (filePath.startsWith('http')) {
      return filePath;
    }
    
    // 从路径中提取excel部分
    let excelPath = filePath;
    if (filePath.includes('excel/')) {
      const excelIndex = filePath.indexOf('excel/');
      if (excelIndex !== -1) {
        excelPath = filePath.substring(excelIndex);
      }
    }
    
    // 构建OSS URL
    // 从第三张图片可以看出正确的URL格式是：
    // https://stock-oss-888.oss-cn-shanghai.aliyuncs.com/excel/20250714/oyuhdzm6_1752495785727_股指报价表20250714.xlsx
    const baseUrl = 'https://stock-oss-888.oss-cn-shanghai.aliyuncs.com/';
    const fullUrl = baseUrl + excelPath;
    
    console.log('构建的OSS URL:', fullUrl);
    return fullUrl;
  } catch (error) {
    console.error('构建OSS URL失败:', error);
    return null;
  }
};

const OptionApi = {
  // 获取STS临时凭证
  getAppSTSToken: (configId = null) => {
    // 确保使用正确的configId
    const finalConfigId = configId || getOssConfigId();
    console.log('获取STS临时凭证，使用configId:', finalConfigId);
    
    return request({
      url: '/infra/file/app-oss-sts/get-token',
      method: 'GET',
      params: { configId: finalConfigId },
      custom: {
        showError: false, // 不自动显示错误，由调用方处理
        showLoading: false,
      },
    }).then(res => {
      console.log('STS凭证响应:', res);
      return res;
    }).catch(err => {
      console.error('获取STS凭证失败:', err);
      throw new Error('获取STS凭证失败: ' + (err.message || '未知错误'));
    });
  },

  // 使用STS凭证获取文件列表
  listFilesWithSTS: (configId = null, path = '', stsInfo) => {
    // 确保使用正确的configId
    const finalConfigId = configId || getOssConfigId();
    console.log('列出文件，使用configId:', finalConfigId, '路径:', path);
    
    if (!stsInfo || !stsInfo.accessKeyId || !stsInfo.accessKeySecret || !stsInfo.securityToken) {
      console.error('STS凭证无效:', stsInfo);
      return Promise.reject(new Error('STS凭证无效'));
    }
    
    return request({
      url: '/infra/file/app-oss-sts/list-files',
      method: 'POST',
      data: {
        configId: finalConfigId,
        path: path || '',
        maxKeys: 100,
        accessKeyId: stsInfo.accessKeyId,
        accessKeySecret: stsInfo.accessKeySecret,
        securityToken: stsInfo.securityToken
      },
      custom: {
        showError: false, // 不自动显示错误，由调用方处理
        showLoading: false,
      },
    }).then(res => {
      console.log(`目录 ${path} 文件列表响应:`, res);
      return res;
    }).catch(err => {
      console.error(`获取目录 ${path} 文件列表失败:`, err);
      throw new Error(`获取目录 ${path} 文件列表失败: ${err.message || '未知错误'}`);
    });
  },

  // 获取有效的STS凭证（缓存或重新获取）
  getValidSTSToken: async (configId = null) => {
    // 确保使用正确的configId
    const finalConfigId = configId || getOssConfigId();
    console.log('获取有效的STS凭证，使用configId:', finalConfigId);
    
    const now = Date.now();
    
    // 检查缓存的凭证是否有效（提前5分钟过期以确保安全）
    if (stsTokenCache.token && stsTokenCache.expireTime > now + 5 * 60 * 1000) {
      console.log('使用缓存的STS凭证');
      return stsTokenCache.token;
    }
    
    // 获取新的STS凭证
    console.log('获取新的STS凭证');
    const response = await OptionApi.getAppSTSToken(finalConfigId);
    
    if (response.code !== 0 || !response.data) {
      console.error('STS凭证响应错误:', response);
      throw new Error('获取STS凭证失败: ' + (response.msg || '未知错误'));
    }
    
    // 计算过期时间（毫秒）
    const expireTime = now + (response.data.expirationSeconds || 3600) * 1000;
    
    // 更新缓存
    stsTokenCache = {
      token: response.data,
      expireTime
    };
    
    console.log('成功获取新的STS凭证，过期时间:', new Date(expireTime).toLocaleString());
    return response.data;
  },

  // 获取OSS文件的访问URL
  getOSSAccessUrl: (path, configId = null) => {
    // 确保使用正确的configId
    const finalConfigId = configId || getOssConfigId();
    console.log('获取OSS访问URL，使用configId:', finalConfigId, '文件路径:', path);
    
    // 确保path有效
    if (!path) {
      console.error('文件路径不能为空');
      return Promise.reject(new Error('文件路径不能为空'));
    }
    
    // 如果path已经是完整的URL，直接返回
    if (path && typeof path === 'string' && path.startsWith('http')) {
      console.log('path已经是完整URL，直接返回:', path);
      return Promise.resolve({ code: 0, data: { accessUrl: path } });
    }
    
    // 处理相对路径，确保格式正确
    let processedPath = path;
    if (path && typeof path === 'string') {
      // 移除开头的斜杠，确保路径格式一致
      if (path.startsWith('/')) {
        processedPath = path.substring(1);
      }
      
      // 处理Excel文件路径中的特殊格式
      if (processedPath.includes('excel/') && !processedPath.startsWith('excel/')) {
        // 提取excel/之后的部分作为实际路径
        const excelIndex = processedPath.indexOf('excel/');
        if (excelIndex !== -1) {
          processedPath = processedPath.substring(excelIndex);
          console.log('处理后的Excel路径:', processedPath);
        }
      }
    }
    
    console.log('处理后的路径:', processedPath);
    
    return request({
      url: '/infra/file/access-url',
      method: 'GET',
      params: {
        configId: finalConfigId,
        path: processedPath,
        timeout: 1800 // 30分钟过期
      },
      custom: {
        showError: false,
        showLoading: false,
        retry: 1, // 请求失败时自动重试1次
      },
    }).then(res => {
      console.log('getAccessUrl API返回结果:', res);
      
      // 检查返回结果
      if (res.code !== 0) {
        throw new Error('获取访问URL失败: ' + (res.msg || '未知错误'));
      }
      
      // 确保返回了有效的URL
      const accessUrl = res.data?.accessUrl || res.data;
      if (!accessUrl || typeof accessUrl !== 'string') {
        throw new Error('返回的访问URL无效');
      }
      
      return res;
    }).catch(err => {
      console.error('getAccessUrl API错误:', err);
      throw new Error('获取访问URL失败: ' + (err.message || '未知错误'));
    });
  },

  // 获取文件分页列表
  getFilePage: (params) => {
    return request({
      url: '/infra/file/page',
      method: 'GET',
      params,
      custom: {
        showError: true,
        showLoading: false,
      },
    });
  },

  // 搜索股票
  searchStocks: (params) => {
    // 使用模拟数据进行开发测试
    const useMockData = stockIndexData.length === 0;
    
    if (useMockData) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // 模拟搜索过滤
          let filteredStocks = mockStocks;
          if (params.keyword) {
            const keyword = params.keyword.toLowerCase();
            filteredStocks = mockStocks.filter(stock => 
              stock.code.includes(keyword) || 
              stock.name.toLowerCase().includes(keyword)
            );
          }
          
          resolve({
            code: 0,
            data: {
              list: filteredStocks,
              total: filteredStocks.length,
              pageNo: params.pageNo,
              pageSize: params.pageSize,
            },
            msg: 'success'
          });
        }, 300); // 模拟网络延迟
      });
    }
    
    // 使用解析的Excel数据
    return new Promise((resolve) => {
      setTimeout(() => {
        // 搜索过滤
        let filteredStocks = [...stockIndexData];
        if (params.keyword) {
          const keyword = params.keyword.toLowerCase();
          filteredStocks = stockIndexData.filter(stock => 
            stock.code.includes(keyword) || 
            stock.name.toLowerCase().includes(keyword)
          );
        }
        
        resolve({
          code: 0,
          data: {
            list: filteredStocks,
            total: filteredStocks.length,
            pageNo: params.pageNo,
            pageSize: params.pageSize,
          },
          msg: 'success'
        });
      }, 300); // 模拟网络延迟
    });
  },
  
  // 期权询价
  optionInquiry: (data) => {
    // 检查是否有解析的期权数据
    const hasStockIndexData = stockIndexData.length > 0;
    const hasOptionData = Object.keys(optionsData).length > 0;

    // 使用模拟数据进行开发测试
    const useMockData = !hasStockIndexData && !hasOptionData;

    if (useMockData) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // 使用Black-Scholes模型计算期权价格
          const result = mockOptionInquiry(data);

          resolve({
            code: 0,
            data: result,
            msg: 'success'
          });
        }, 800); // 模拟网络延迟
      });
    }

    // 使用解析的Excel数据
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // 支持新的参数结构
          if (data.term && data.structureType) {
            // 新的询价参数结构
            const result = extractOptionInquiryFromExcel(stockIndexData, optionsData, data);
            resolve({
              code: 0,
              data: result,
              msg: 'success'
            });
          } else {
            // 兼容旧的参数结构
            const { stockCode, currentPrice, optionType, strikePrice, expiryDate, quantity = 1, volatility, riskFreeRate } = data;

            // 尝试从期权报价表中查找匹配的期权
            const option = findOptionPrice(optionsData, stockCode, optionType, strikePrice, expiryDate);

            let result;
            if (option) {
              // 如果找到匹配的期权，直接使用其价格和希腊字母
              result = {
                price: (option.price * quantity).toFixed(2),
                delta: option.delta.toFixed(4),
                gamma: option.gamma.toFixed(4),
                theta: option.theta.toFixed(4),
                vega: option.vega.toFixed(4)
              };
            } else {
              // 如果没有找到匹配的期权，使用Black-Scholes模型计算
              // 计算到期时间（年）
              const today = new Date();
              const expiry = new Date(expiryDate);
              const timeToExpiry = (expiry - today) / (365 * 24 * 60 * 60 * 1000);

              // 使用默认值或传入的值
              const sigma = volatility ? volatility / 100 : 0.3; // 波动率
              const r = riskFreeRate ? riskFreeRate / 100 : 0.03; // 无风险利率

              // 计算期权价格和希腊字母
              const calculatedResult = calculateOptionPrice(
                optionType,
                currentPrice,
                strikePrice,
                timeToExpiry,
                r,
                sigma
              );

              // 调整价格为总价
              calculatedResult.price = (parseFloat(calculatedResult.price) * quantity).toFixed(2);

              result = calculatedResult;
            }

            resolve({
              code: 0,
              data: result,
              msg: 'success'
            });
          }
        } catch (error) {
          console.error('期权询价失败:', error);
          reject({
            code: -1,
            msg: error.message || '期权询价失败'
          });
        }
      }, 800); // 模拟网络延迟
    });
  },
  
  // 获取期权历史询价记录
  getInquiryHistory: (params) => {
    // 使用模拟数据进行开发测试
    const useMockData = true;
    
    if (useMockData) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // 模拟历史询价记录
          const mockHistory = [
            {
              id: 1001,
              stockCode: '600000',
              stockName: '浦发银行',
              optionType: 'call',
              strikePrice: 11.00,
              expiryDate: '2023-12-31',
              price: 1.25,
              createTime: '2023-06-15 14:30:22'
            },
            {
              id: 1002,
              stockCode: '601318',
              stockName: '中国平安',
              optionType: 'put',
              strikePrice: 55.00,
              expiryDate: '2023-09-30',
              price: 3.78,
              createTime: '2023-06-14 09:15:45'
            },
            {
              id: 1003,
              stockCode: '600519',
              stockName: '贵州茅台',
              optionType: 'call',
              strikePrice: 1800.00,
              expiryDate: '2023-12-31',
              price: 125.50,
              createTime: '2023-06-13 16:45:10'
            }
          ];
          
          // 简单分页
          const start = (params.pageNo - 1) * params.pageSize;
          const end = start + params.pageSize;
          const list = mockHistory.slice(start, end);
          
          resolve({
            code: 0,
            data: {
              list,
              total: mockHistory.length,
              pageNo: params.pageNo,
              pageSize: params.pageSize
            },
            msg: 'success'
          });
        }, 500); // 模拟网络延迟
      });
    }
    
    // 实际接口调用
    return request({
      url: '/stocks-front/option/inquiry/history',
      method: 'GET',
      params,
      custom: {
        showError: true,
        showLoading: true,
      },
    });
  },

  // 从OSS加载Excel文件并解析
  loadExcelFilesFromOSS: async () => {
    try {
      const results = {
        stockIndexLoaded: false,
        optionsLoaded: false,
        stockIndexCount: 0,
        optionsCount: 0,
        underlyings: 0,
        stockIndexData: [], // 添加原始数据用于调试
        optionsData: {}, // 添加原始数据用于调试
        debugInfo: {
          stockIndexFiles: [],
          optionsFiles: [],
          errors: []
        }
      };

      // 获取configId
      const finalConfigId = getOssConfigId();
      console.log('从OSS加载Excel文件，使用configId:', finalConfigId);
      
      try {
        // 1. 首先从数据库获取Excel文件列表
        console.log('开始从数据库获取Excel文件列表');
        const fileListResponse = await request({
          url: '/infra/file/page',
          method: 'GET',
          params: {
            pageNo: 1,
            pageSize: 100
          },
          custom: {
            showError: false,
            showLoading: false,
          },
        });
        
        console.log('从数据库获取文件列表响应:', fileListResponse);
        
        if (fileListResponse.code !== 0 || !fileListResponse.data || !fileListResponse.data.list) {
          throw new Error('从数据库获取文件列表失败: ' + (fileListResponse.msg || '未知错误'));
        }
        
        const dbFileList = fileListResponse.data.list;
        console.log('数据库文件列表:', dbFileList);
        
        // 筛选Excel文件
        const excelFiles = dbFileList.filter(file => {
          // 检查文件路径或URL是否存在
          const filePath = file.path || file.url || '';
          return filePath.toLowerCase().endsWith('.xlsx') || filePath.toLowerCase().endsWith('.xls');
        });
        
        console.log('筛选出Excel文件:', excelFiles);
        
        if (excelFiles.length === 0) {
          throw new Error('数据库中未找到Excel文件');
        }
        
        // 2. 识别并下载股指报价表和期权报价表
        // 2.1 识别股指报价表
        const stockIndexFilePatterns = ['股指报价表', '中证'];
        const stockIndexFiles = excelFiles.filter(file => {
          const filePath = file.path || file.url || '';
          const fileName = file.name || '';
          return stockIndexFilePatterns.some(pattern => 
            filePath.includes(pattern) || fileName.includes(pattern)
          );
        });
        
        console.log('找到股指报价表文件:', stockIndexFiles);

        // 2.2 下载并解析股指报价表
        for (const file of stockIndexFiles) {
          try {
            // 使用access-url接口获取带认证的访问URL
            const filePath = file.path || file.url || '';
            console.log(`获取股指文件访问URL: ${filePath}`);

            // 下载并解析Excel文件
            const stockIndexData = await OptionApi.downloadAndParseExcelFromOSS(filePath);

            console.log(`股指文件加载成功:`, {
              dataLength: stockIndexData.length,
              sampleData: stockIndexData.slice(0, 3) // 显示前3条数据
            });

            OptionApi.processStockIndexDataFromOSS(stockIndexData);
            results.stockIndexLoaded = true;
            results.stockIndexCount = stockIndexData.length;
            results.stockIndexData = stockIndexData.slice(0, 10); // 保存前10条用于调试
            results.debugInfo.stockIndexFiles.push({
              filePath: file.path || file.url || file.name,
              success: true,
              count: stockIndexData.length
            });
            break; // 成功加载后退出循环
          } catch (error) {
            console.error(`加载股指文件失败:`, error);
            results.debugInfo.stockIndexFiles.push({
              filePath: file.path || file.url || file.name,
              success: false,
              error: error.message
            });
            results.debugInfo.errors.push(`股指文件 ${file.path || file.url || file.name}: ${error.message}`);
          }
        }

        // 2.3 识别期权报价表
        const optionsFilePatterns = ['期权报价表', '中信'];
        const optionsFiles = excelFiles.filter(file => {
          const filePath = file.path || file.url || '';
          const fileName = file.name || '';
          return optionsFilePatterns.some(pattern => 
            filePath.includes(pattern) || fileName.includes(pattern)
          );
        });
        
        console.log('找到期权报价表文件:', optionsFiles);

        // 2.4 下载并解析期权报价表
        for (const file of optionsFiles) {
          try {
            // 使用access-url接口获取带认证的访问URL
            const filePath = file.path || file.url || '';
            console.log(`获取期权文件访问URL: ${filePath}`);

            // 下载并解析Excel文件
            const optionsData = await OptionApi.downloadAndParseExcelFromOSS(filePath);

            console.log(`期权文件加载成功:`, {
              underlyings: Object.keys(optionsData),
              sampleData: Object.entries(optionsData).slice(0, 2) // 显示前2个标的的数据
            });

            OptionApi.processStockOptionsDataFromOSS(optionsData);
            results.optionsLoaded = true;

            // 计算期权数量
            let totalOptions = 0;
            Object.values(optionsData).forEach(item => {
              totalOptions += item.callOptions.length + item.putOptions.length;
            });
            results.optionsCount = totalOptions;
            results.underlyings = Object.keys(optionsData).length;

            // 保存部分数据用于调试
            const debugOptionsData = {};
            Object.entries(optionsData).slice(0, 3).forEach(([key, value]) => {
              debugOptionsData[key] = {
                callOptions: value.callOptions.slice(0, 3),
                putOptions: value.putOptions.slice(0, 3)
              };
            });
            results.optionsData = debugOptionsData;

            results.debugInfo.optionsFiles.push({
              filePath: file.path || file.url || file.name,
              success: true,
              underlyings: Object.keys(optionsData).length,
              totalOptions
            });
            break; // 成功加载后退出循环
          } catch (error) {
            console.error(`加载期权文件失败:`, error);
            results.debugInfo.optionsFiles.push({
              filePath: file.path || file.url || file.name,
              success: false,
              error: error.message
            });
            results.debugInfo.errors.push(`期权文件 ${file.path || file.url || file.name}: ${error.message}`);
          }
        }
        
        // 3. 如果没有找到特定文件，尝试解析所有Excel文件
        if (!results.stockIndexLoaded && !results.optionsLoaded) {
          console.log('未找到特定命名的文件，尝试解析所有Excel文件');
          
          for (const file of excelFiles) {
            try {
              // 使用access-url接口获取带认证的访问URL
              const filePath = file.path || file.url || '';
              console.log(`尝试解析文件: ${filePath}`);

              // 下载并解析Excel文件
              const data = await OptionApi.downloadAndParseExcelFromOSS(filePath);
              
              // 判断返回的数据类型
              if (Array.isArray(data)) {
                // 是数组，可能是股指数据
                console.log(`文件解析为股指数据，共 ${data.length} 条记录`);
                OptionApi.processStockIndexDataFromOSS(data);
                results.stockIndexLoaded = true;
                results.stockIndexCount = data.length;
                results.stockIndexData = data.slice(0, 10);
                results.debugInfo.stockIndexFiles.push({
                  filePath: file.path || file.url || file.name,
                  success: true,
                  count: data.length
                });
              } else if (typeof data === 'object' && data !== null) {
                // 是对象，可能是期权数据
                const underlyings = Object.keys(data);
                if (underlyings.length > 0) {
                  console.log(`文件解析为期权数据，共 ${underlyings.length} 个标的`);
                  OptionApi.processStockOptionsDataFromOSS(data);
                  results.optionsLoaded = true;
                  
                  // 计算期权数量
                  let totalOptions = 0;
                  Object.values(data).forEach(item => {
                    totalOptions += item.callOptions.length + item.putOptions.length;
                  });
                  results.optionsCount = totalOptions;
                  results.underlyings = underlyings.length;
                  
                  // 保存部分数据用于调试
                  const debugOptionsData = {};
                  Object.entries(data).slice(0, 3).forEach(([key, value]) => {
                    debugOptionsData[key] = {
                      callOptions: value.callOptions.slice(0, 3),
                      putOptions: value.putOptions.slice(0, 3)
                    };
                  });
                  results.optionsData = debugOptionsData;
                  
                  results.debugInfo.optionsFiles.push({
                    filePath: file.path || file.url || file.name,
                    success: true,
                    underlyings: underlyings.length,
                    totalOptions
                  });
                }
              }
            } catch (error) {
              console.error(`解析文件失败:`, error);
              results.debugInfo.errors.push(`解析文件 ${file.path || file.url || file.name}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.error('处理Excel文件失败:', error);
        results.debugInfo.errors.push(`处理Excel文件失败: ${error.message}`);
        throw error;
      }

      return {
        code: 0,
        data: results,
        msg: 'success'
      };

    } catch (error) {
      console.error('从OSS加载Excel文件失败:', error);
      return {
        code: -1,
        msg: error.message || '从OSS加载Excel文件失败'
      };
    }
  },

  // 使用STS凭证下载并解析Excel文件
  downloadAndParseExcelWithSTS: async (fileUrl) => {
    try {
      console.log(`开始下载Excel文件: ${fileUrl}`);
      
      // 确保URL有效
      if (!fileUrl || typeof fileUrl !== 'string') {
        throw new Error('无效的文件URL');
      }
      
      console.log(`发起文件下载请求: ${fileUrl}`);
      
      // 使用文件URL直接下载文件
      const response = await new Promise((resolve, reject) => {
        uni.request({
          url: fileUrl,
          method: 'GET',
          responseType: 'arraybuffer',
          header: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          success: (res) => {
            console.log(`文件下载响应状态: ${res.statusCode}`, {
              dataType: res.data ? typeof res.data : 'null',
              dataLength: res.data ? res.data.byteLength : 0
            });
            
            if (res.statusCode !== 200 && res.statusCode !== 304) {
              return reject(new Error(`下载文件失败: 状态码 ${res.statusCode}`));
            }
            
            resolve(res);
          },
          fail: (err) => {
            console.error('文件下载失败:', err);
            reject(new Error(`文件下载失败: ${err.errMsg || JSON.stringify(err)}`));
          }
        });
      });

      // 304状态码表示文件未修改，但仍然可以使用缓存的内容
      if (response.statusCode === 304) {
        console.warn('文件返回304状态码，使用缓存内容');
      }

      // 检查文件是否为空
      if (!response.data) {
        throw new Error('文件内容为空');
      }

      // 检查响应数据类型
      if (!(response.data instanceof ArrayBuffer)) {
        throw new Error(`响应数据类型错误: ${typeof response.data}`);
      }

      // 转换为Uint8Array
      const uint8Array = new Uint8Array(response.data);
      console.log(`文件大小: ${uint8Array.length} 字节`);
      
      // 输出文件头部信息以便调试
      const headerBytes = Array.from(uint8Array.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`文件头16字节: ${headerBytes}`);

      // 检查Excel文件头
      const isExcel = OptionApi.isExcelFile(uint8Array);
      if (!isExcel) {
        throw new Error('文件不是有效的Excel格式');
      }

      // 根据文件URL或路径判断类型并解析
      console.log(`开始解析Excel文件`);
      try {
        // 提取文件名用于判断类型
        let fileName = '';
        if (fileUrl.includes('/')) {
          fileName = fileUrl.split('/').pop().toLowerCase();
        } else {
          fileName = fileUrl.toLowerCase();
        }
        
        console.log('提取的文件名:', fileName);
        
        // 尝试使用XLSX解析
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        console.log('Excel读取成功，工作表数量:', workbook.SheetNames.length);
        
        if (fileName.includes('股指') || fileName.includes('中证')) {
          const result = parseStockIndexExcel(uint8Array);
          console.log(`股指数据解析完成，共 ${result.length} 条记录`);
          return result;
        } else if (fileName.includes('期权') || fileName.includes('中信')) {
          const result = parseOptionsExcel(uint8Array);
          console.log(`期权数据解析完成，共 ${Object.keys(result).length} 个标的`);
          return result;
        } else {
          // 如果文件名没有明确指示，尝试解析为股指数据
          try {
            const stockResult = parseStockIndexExcel(uint8Array);
            if (stockResult && stockResult.length > 0) {
              console.log(`文件解析为股指数据，共 ${stockResult.length} 条记录`);
              return stockResult;
            }
          } catch (stockError) {
            console.warn('尝试解析为股指数据失败:', stockError);
          }
          
          // 尝试解析为期权数据
          try {
            const optionsResult = parseOptionsExcel(uint8Array);
            if (optionsResult && Object.keys(optionsResult).length > 0) {
              console.log(`文件解析为期权数据，共 ${Object.keys(optionsResult).length} 个标的`);
              return optionsResult;
            }
          } catch (optionsError) {
            console.warn('尝试解析为期权数据失败:', optionsError);
          }
          
          throw new Error('无法确定文件类型或解析失败');
        }
      } catch (parseError) {
        console.error('Excel解析错误:', parseError);
        throw new Error(`Excel解析错误: ${parseError.message}`);
      }
    } catch (error) {
      console.error('下载并解析Excel文件失败:', error);
      throw error;
    }
  },

  // 使用access-url接口下载并解析Excel文件
  downloadAndParseExcelFromOSS: async (filePath) => {
    try {
      console.log(`开始下载Excel文件: ${filePath}`);
      
      // 获取访问URL
      const accessUrlResponse = await OptionApi.getOSSAccessUrl(filePath);
      console.log('获取访问URL响应:', accessUrlResponse);
      
      if (accessUrlResponse.code !== 0) {
        throw new Error('获取访问URL失败: ' + accessUrlResponse.msg);
      }

      const accessUrl = accessUrlResponse.data.accessUrl || accessUrlResponse.data;
      if (!accessUrl || typeof accessUrl !== 'string') {
        throw new Error(`无效的访问URL: ${JSON.stringify(accessUrl)}`);
      }
      
      console.log(`使用URL下载文件: ${accessUrl.substring(0, 100)}...`);

      // 使用访问URL下载文件
      const response = await new Promise((resolve, reject) => {
        uni.request({
          url: accessUrl,
          method: 'GET',
          responseType: 'arraybuffer',
          header: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          success: (res) => {
            console.log(`文件下载响应状态: ${res.statusCode}`, {
              dataType: res.data ? typeof res.data : 'null',
              dataLength: res.data ? res.data.byteLength : 0
            });
            resolve(res);
          },
          fail: (err) => {
            console.error('文件下载失败:', err);
            reject(err);
          }
        });
      });

      if (response.statusCode !== 200 && response.statusCode !== 304) {
        throw new Error(`下载文件失败: 状态码 ${response.statusCode}`);
      }

      // 304状态码表示文件未修改，但仍然可以使用缓存的内容
      if (response.statusCode === 304) {
        console.warn('文件返回304状态码，使用缓存内容');
      }

      // 检查文件是否为空
      if (!response.data) {
        throw new Error('文件内容为空');
      }

      // 检查响应数据类型
      if (!(response.data instanceof ArrayBuffer)) {
        throw new Error(`响应数据类型错误: ${typeof response.data}`);
      }

      // 转换为Uint8Array
      const uint8Array = new Uint8Array(response.data);
      console.log(`文件大小: ${uint8Array.length} 字节`);
      
      // 输出文件头部信息以便调试
      const headerBytes = Array.from(uint8Array.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`文件头16字节: ${headerBytes}`);

      // 检查Excel文件头
      const isExcel = OptionApi.isExcelFile(uint8Array);
      if (!isExcel) {
        throw new Error('文件不是有效的Excel格式');
      }

      // 根据文件路径判断类型并解析
      console.log(`开始解析Excel文件: ${filePath}`);
      try {
        if (filePath.includes('股指')) {
          const result = parseStockIndexExcel(uint8Array);
          console.log(`股指数据解析完成，共 ${result.length} 条记录`);
          return result;
        } else if (filePath.includes('期权')) {
          const result = parseOptionsExcel(uint8Array);
          console.log(`期权数据解析完成，共 ${Object.keys(result).length} 个标的`);
          return result;
        } else {
          throw new Error('未知的文件类型');
        }
      } catch (parseError) {
        console.error('Excel解析错误:', parseError);
        throw new Error(`Excel解析错误: ${parseError.message}`);
      }
    } catch (error) {
      console.error('下载并解析Excel文件失败:', error);
      throw error;
    }
  },

  // 检查是否为Excel文件
  isExcelFile: (uint8Array) => {
    if (!uint8Array || uint8Array.length < 8) {
      console.error('文件数据无效或太小');
      return false;
    }

    // 检查Excel文件头
    // XLSX文件头: 50 4B 03 04 (ZIP文件头)
    // XLS文件头: D0 CF 11 E0 A1 B1 1A E1 (OLE文件头)
    const header = Array.from(uint8Array.slice(0, 8));
    console.log('检查文件头:', header.map(b => b.toString(16).padStart(2, '0')).join(' '));

    // XLSX (ZIP格式)
    if (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) {
      console.log('检测到XLSX格式 (ZIP)');
      return true;
    }

    // XLS (OLE格式)
    if (header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0) {
      console.log('检测到XLS格式 (OLE)');
      return true;
    }

    console.error('未检测到有效的Excel文件头');
    return false;
  },
  
  // 获取OSS配置
  getOSSConfig: () => {
    return {
      configId: ossConfigId,
      apiPath: '/infra/file/access-url'
    };
  },

  // 处理从OSS加载的股指数据
  processStockIndexDataFromOSS: (data) => {
    stockIndexData = data;
  },

  // 处理从OSS加载的期权数据
  processStockOptionsDataFromOSS: (data) => {
    optionsData = data;
  },
  
  // 获取已加载的股指数据状态
  getLoadedStockIndexData: () => {
    return {
      code: 0,
      data: {
        loaded: stockIndexData.length > 0,
        count: stockIndexData.length,
        list: stockIndexData
      }
    };
  },
  
  // 获取已加载的期权数据状态
  getLoadedOptionsData: () => {
    const underlyings = Object.keys(optionsData);
    let totalCount = 0;
    
    Object.values(optionsData).forEach(item => {
      totalCount += item.callOptions.length + item.putOptions.length;
    });
    
    return {
      code: 0,
      data: {
        loaded: underlyings.length > 0,
        underlyings: underlyings.length,
        count: totalCount
      }
    };
  }
};

export default OptionApi; 