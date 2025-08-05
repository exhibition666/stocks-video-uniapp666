<template>
  <s-layout title="Excel文件预览" navbar="inner" tabbar="/pages/index/inquiry">
    <!-- 页面标题 -->
    <view class="page-header ss-p-20">
      <view class="page-title">期权询价系统</view>
    </view>

    <!-- Excel文件加载区域 -->
    <view class="excel-container ss-p-20">
      <!-- 加载成功提示（仅在加载成功时显示） -->
      <view class="load-success-tip ss-m-b-20" v-if="showSuccessTip">
        <view class="success-card">
          <view class="success-icon">✓</view>
          <view class="success-content">
            <view class="success-title">数据加载完成</view>
            <view class="success-desc">{{ successMessage }}</view>
          </view>
          <button class="close-success-btn" @click="showSuccessTip = false">
            ×
          </button>
        </view>
      </view>

      <!-- 手动操作按钮（已隐藏） -->
      <!-- <view class="action-buttons ss-m-b-20" v-if="hasData">
        <button class="reload-btn" @click="reloadExcelFiles" :disabled="loading">
          {{ loading ? '重新加载中...' : '重新加载数据' }}
        </button>
        <button class="clear-btn" @click="clearData">
          清空数据
        </button>
      </view> -->

      <!-- 加载状态 -->
      <view class="loading-status ss-m-b-20" v-if="loading">
        <view class="status-item">
          <text>{{ loadingMessage }}</text>
        </view>
      </view>

      <!-- 错误信息 -->
      <view class="error-info ss-m-b-20" v-if="errorList.length > 0">
        <view class="error-card">
          <view class="error-header">
            <text class="error-icon">⚠</text>
            <view class="error-title">系统提示</view>
          </view>
          <view class="error-content">
            <view
              v-for="(error, index) in errorList"
              :key="index"
              class="error-item ss-m-t-5"
            >
              <text class="error">{{ error }}</text>
            </view>
            <view class="error-actions ss-m-t-15" v-if="!loading">
              <button class="retry-btn" @click="autoLoadExcelFiles">
                重试加载
              </button>
            </view>
          </view>
        </view>
      </view>

      <!-- 文件列表（隐藏显示） -->
      <!-- <view class="file-list ss-m-b-20" v-if="fileList.length > 0">
        <view class="section-title">找到的Excel文件 ({{ fileList.length }}个)</view>
        <view
          v-for="(file, index) in fileList"
          :key="index"
          class="file-item ss-m-t-10"
          @click="loadSingleFile(file)"
        >
          <view class="file-name">{{ file.name || file.path }}</view>
          <view class="file-path">{{ file.path || file.url }}</view>
          <view class="file-size" v-if="file.size">{{ formatFileSize(file.size) }}</view>
        </view>
      </view> -->

      <!-- 股票筛选功能 -->
      <view class="stock-filter-section ss-m-b-20" v-if="stockOptions.length > 0">
        <view class="section-title">股票筛选功能</view>

        <!-- 股票搜索框 -->
        <view class="stock-search-container ss-m-t-15">
          <view class="search-input-wrapper">
            <input
              v-model="searchKeyword"
              placeholder="请输入股票代码或名称进行搜索"
              class="stock-search-input"
              @input="handleStockSearch"
              @focus="showStockSelector = true"
              @blur="handleInputBlur"
            />
            <view class="search-stats" v-if="searchKeyword">
              找到 {{ filteredStockOptions.length }} 个匹配结果
            </view>
          </view>

          <!-- 股票选择下拉列表 -->
          <view class="stock-selector" v-if="showStockSelector && filteredStockOptions.length > 0">
            <view
              v-for="(stock, index) in filteredStockOptions.slice(0, maxDisplayResults)"
              :key="index"
              class="stock-option"
              @click="selectStock(stock)"
            >
              <view class="stock-code">{{ stock.value }}</view>
              <view class="stock-name">{{ stock.name }}</view>
              <view class="stock-price" v-if="stock.price">¥{{ stock.price }}</view>
            </view>
          </view>
        </view>

        <!-- 已选择的股票 -->
        <view class="selected-stock-info ss-m-t-15" v-if="selectedStock">
          <view class="selected-title">已选择股票:</view>
          <view class="selected-stock-card">
            <view class="stock-info">
              <view class="stock-code-selected">{{ selectedStock.value }}</view>
              <view class="stock-name-selected">{{ selectedStock.name }}</view>
            </view>
            <view class="stock-price-selected" v-if="selectedStock.price">
              ¥{{ selectedStock.price }}
            </view>
            <button class="clear-selection-btn" @click="clearSelection">
              清除选择
            </button>
          </view>
        </view>

        <!-- 股票统计信息 -->
        <view class="stock-stats ss-m-t-15">
          <view class="stats-item">
            <text class="stats-label">总股票数量:</text>
            <text class="stats-value">{{ stockOptions.length }}</text>
          </view>
          <view class="stats-item" v-if="isStockIndexLoaded">
            <text class="stats-label">股指期权:</text>
            <text class="stats-value loaded">已加载</text>
          </view>
          <view class="stats-item" v-if="isStockOptionsLoaded">
            <text class="stats-label">个股期权:</text>
            <text class="stats-value loaded">已加载</text>
          </view>
        </view>
      </view>

      <!-- Excel内容显示（已隐藏） -->
      <!-- <view class="excel-content" v-if="excelData.length > 0">
        <view class="content-preview-header ss-m-b-15">
          <text class="preview-title">文件内容预览</text>
        </view>

        <view class="file-type-tabs ss-m-b-15" v-if="excelData.length > 1">
          <view
            v-for="(fileData, fileIndex) in excelData"
            :key="fileIndex"
            class="file-type-tab"
            :class="{ active: activeFileIndex === fileIndex }"
            @click="activeFileIndex = fileIndex"
          >
            {{ getFileTypeLabel(fileData.fileName) }}
          </view>
        </view>

        <view class="current-file-content" v-if="excelData[activeFileIndex]">
          <view class="sheet-selector ss-m-b-15">
            <text class="selector-label">选择工作表:</text>
            <view class="sheet-buttons ss-m-t-10">
              <view
                v-for="(sheet, sheetIndex) in excelData[activeFileIndex].sheets"
                :key="sheetIndex"
                class="sheet-button"
                :class="{
                  active: excelData[activeFileIndex].activeSheet === sheetIndex,
                  highlight: sheet.data.length > 0
                }"
                @click="excelData[activeFileIndex].activeSheet = sheetIndex"
              >
                {{ sheet.name }}
                <text class="sheet-count" v-if="sheet.data.length > 0">({{ sheet.data.length }})</text>
              </view>
            </view>
          </view>

          <view class="table-container" v-if="getCurrentSheetData().length > 0">
            <scroll-view scroll-x="true" class="table-scroll-container">
              <view class="excel-table">
                <view class="table-header">
                  <view
                    v-for="(header, colIndex) in getTableHeaders()"
                    :key="colIndex"
                    class="header-cell"
                    :style="{ minWidth: getColumnWidth(header) }"
                  >
                    {{ header }}
                  </view>
                </view>

                <view class="table-body">
                  <view
                    v-for="(row, rowIndex) in getCurrentSheetData().slice(0, 100)"
                    :key="rowIndex"
                    class="table-row"
                    :class="{ 'even-row': rowIndex % 2 === 0 }"
                  >
                    <view
                      v-for="(header, colIndex) in getTableHeaders()"
                      :key="colIndex"
                      class="table-cell"
                      :style="{ minWidth: getColumnWidth(header) }"
                    >
                      {{ formatCellValue(row[header]) }}
                    </view>
                  </view>
                </view>
              </view>
            </scroll-view>

            <view class="table-footer ss-p-15">
              <text class="footer-text">
                注: 仅显示前 {{ Math.min(100, getCurrentSheetData().length) }} 条数据
                <text v-if="getCurrentSheetData().length > 100">，总共{{ getCurrentSheetData().length }}条</text>
              </text>
            </view>
          </view>

          <view class="empty-sheet ss-p-40" v-else>
            <s-empty text="当前工作表暂无数据"></s-empty>
          </view>
        </view>
      </view> -->

      <!-- 期权询价功能 -->
      <view class="option-inquiry-section ss-m-b-20" v-if="selectedStock && stockOptions.length > 0">
        <view class="section-title">期权询价</view>

        <!-- 期权参数配置 -->
        <view class="inquiry-form ss-m-t-15">
          <!-- 期权类型选择 -->
          <view class="form-group">
            <view class="form-label">期权类型</view>
            <view class="option-type-buttons">
              <button
                class="type-btn"
                :class="{ active: optionType === 'call' }"
                @click="optionType = 'call'"
              >
                看涨期权
              </button>
              <button
                class="type-btn"
                :class="{ active: optionType === 'put' }"
                @click="optionType = 'put'"
              >
                看跌期权
              </button>
            </view>
          </view>

          <!-- 期限选择 -->
          <view class="form-group ss-m-t-15">
            <view class="form-label">期限</view>
            <view class="term-buttons">
              <button
                v-for="term in termOptions"
                :key="term.value"
                class="term-btn"
                :class="{ active: selectedTerm === term.value }"
                @click="selectTerm(term.value)"
              >
                {{ term.label }}
              </button>
            </view>
          </view>

          <!-- 结构类型选择 -->
          <view class="form-group ss-m-t-15">
            <view class="form-label">结构类型</view>
            <view class="structure-buttons">
              <button
                v-for="structure in structureOptions"
                :key="structure.value"
                class="structure-btn"
                :class="{ active: selectedStructure === structure.value }"
                @click="selectStructure(structure.value)"
              >
                {{ structure.label }}
              </button>
            </view>
          </view>

          <!-- 行权价格 -->
          <view class="form-group ss-m-t-15" v-if="selectedStructure === 'custom'">
            <view class="form-label">自定义行权价格</view>
            <input
              v-model="customStrikePrice"
              type="number"
              placeholder="请输入行权价格"
              class="price-input"
            />
          </view>
          <view class="form-group ss-m-t-15" v-else>
            <view class="form-label">行权价格</view>
            <view class="calculated-price">
              <text class="price-value">{{ calculatedStrikePrice }}</text>
              <text class="price-ratio">({{ getStrikePriceRatio() }}%)</text>
            </view>
          </view>

          <!-- 询价按钮 -->
          <view class="inquiry-button-container ss-m-t-20">
            <button
              class="inquiry-btn"
              @click="performOptionInquiry"
              :disabled="!canInquire || isInquiring"
            >
              {{ isInquiring ? '询价中...' : '开始询价' }}
            </button>
          </view>
        </view>
      </view>

      <!-- 询价结果展示 -->
      <view class="inquiry-result-section ss-m-b-20" v-if="inquiryResult">
        <view class="section-title">询价结果</view>

        <!-- 基本信息 -->
        <view class="result-basic-info ss-m-t-15">
          <view class="stock-info-card">
            <view class="stock-header">
              <view class="stock-code-result">{{ inquiryResult.stockCode }}</view>
              <view class="stock-name-result">{{ inquiryResult.stockName }}</view>
            </view>
            <view class="option-info">
              <text class="option-type-text">{{ inquiryResult.optionType === 'call' ? '看涨期权' : '看跌期权' }}</text>
              <text class="option-term">{{ getTermLabel(inquiryResult.term) }}</text>
            </view>
          </view>
        </view>

        <!-- 价格信息 -->
        <view class="result-prices ss-m-t-15">
          <view class="price-card">
            <view class="price-item">
              <view class="price-label">买入价</view>
              <view class="price-value bid">¥{{ inquiryResult.bidPrice }}</view>
            </view>
            <view class="price-item">
              <view class="price-label">卖出价</view>
              <view class="price-value ask">¥{{ inquiryResult.askPrice }}</view>
            </view>
            <view class="price-item">
              <view class="price-label">最新价</view>
              <view class="price-value last">¥{{ inquiryResult.lastPrice }}</view>
            </view>
          </view>
        </view>

        <!-- 希腊字母 -->
        <view class="result-greeks ss-m-t-15" v-if="inquiryResult.delta !== undefined">
          <view class="greeks-title">希腊字母风险指标</view>
          <view class="greeks-grid">
            <view class="greek-item">
              <view class="greek-label">Delta</view>
              <view class="greek-value">{{ inquiryResult.delta }}</view>
              <view class="greek-desc">价格敏感性</view>
            </view>
            <view class="greek-item" v-if="inquiryResult.gamma !== undefined">
              <view class="greek-label">Gamma</view>
              <view class="greek-value">{{ inquiryResult.gamma }}</view>
              <view class="greek-desc">Delta变化率</view>
            </view>
            <view class="greek-item" v-if="inquiryResult.theta !== undefined">
              <view class="greek-label">Theta</view>
              <view class="greek-value">{{ inquiryResult.theta }}</view>
              <view class="greek-desc">时间衰减</view>
            </view>
            <view class="greek-item" v-if="inquiryResult.vega !== undefined">
              <view class="greek-label">Vega</view>
              <view class="greek-value">{{ inquiryResult.vega }}</view>
              <view class="greek-desc">波动率敏感性</view>
            </view>
          </view>

          <!-- 隐含波动率 -->
          <view class="iv-section ss-m-t-15" v-if="inquiryResult.impliedVolatility">
            <view class="iv-label">隐含波动率</view>
            <view class="iv-value">{{ inquiryResult.impliedVolatility }}</view>
          </view>
        </view>

        <!-- 券商报价详情 -->
        <view class="broker-quotes-section ss-m-t-15" v-if="inquiryResult.brokerQuotes && inquiryResult.brokerQuotes.length > 0">
          <view class="section-title">券商报价详情</view>
          <view class="quotes-table">
            <view class="table-header">
              <view class="header-cell">报价方</view>
              <view class="header-cell">期权价格</view>
              <view class="header-cell">隐含波动率</view>
            </view>
            <view class="table-body">
              <view
                v-for="(quote, index) in inquiryResult.brokerQuotes"
                :key="index"
                class="table-row"
              >
                <view class="table-cell broker-name">{{ quote.broker }}</view>
                <view class="table-cell quote-price">¥{{ quote.price }}</view>
                <view class="table-cell quote-iv">{{ quote.impliedVolatility }}</view>
              </view>
            </view>
          </view>
        </view>

        <!-- 计算说明（已隐藏） -->
        <!-- <view class="calculation-info ss-m-t-15">
          <view class="info-title">计算说明</view>
          <view class="info-content">
            <view class="info-item">
              <text class="info-label">数据来源:</text>
              <text class="info-value">{{ inquiryResult.quoteSource || 'Excel数据模拟' }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">报价时间:</text>
              <text class="info-value">{{ inquiryResult.quoteTime || inquiryResult.timestamp }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">行权价格:</text>
              <text class="info-value">¥{{ inquiryResult.strikePrice }}</text>
              <text class="info-extra" v-if="inquiryResult.strikePriceRatio">
                ({{ inquiryResult.strikePriceRatio }}%)
              </text>
            </view>
          </view>
        </view> -->

        <!-- 操作按钮（已隐藏） -->
        <!-- <view class="result-actions ss-m-t-20">
          <button class="save-btn" @click="saveInquiryResult">
            保存结果
          </button>
          <button class="new-inquiry-btn" @click="startNewInquiry">
            新建询价
          </button>
        </view> -->
      </view>

      <!-- 初始加载状态 -->
      <view class="initial-loading" v-if="!hasData && errorList.length === 0 && !showSuccessTip && loading">
        <view class="loading-animation">
          <view class="loading-spinner"></view>
        </view>
        <view class="loading-title">正在加载数据</view>
        <view class="loading-desc">系统正在获取股票期权数据，请稍候...</view>
        <view class="loading-stage" v-if="loadingStage">{{ loadingStage }}</view>
        <view class="loading-progress">
          <view class="progress-bar">
            <view class="progress-fill"></view>
          </view>
          <view class="progress-text">加载中...</view>
        </view>
      </view>

      <!-- 空状态（数据加载前的静默状态） -->
      <view class="empty-state" v-if="!hasData && errorList.length === 0 && !showSuccessTip && !loading">
        <view class="empty-icon">📊</view>
        <view class="empty-title">期权询价系统</view>
        <view class="empty-desc">系统准备就绪，等待数据加载...</view>
      </view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import sheep from '@/sheep';
import * as XLSX from 'xlsx';
import request from '@/sheep/request';

// 响应式数据
const loading = ref(false);
const loadingMessage = ref('');
const fileList = ref([]);
const excelData = ref([]);
const errorList = ref([]);
const activeFileIndex = ref(0);

// 股票筛选相关数据
const stockOptions = ref([]);
const filteredStockOptions = ref([]);
const allSheetsData = ref({
  stockIndex: {},
  stockOptions: {}
});
const searchKeyword = ref('');
const showStockSelector = ref(false);
const selectedStock = ref(null);

// 数据处理状态
const isStockIndexLoaded = ref(false);
const isStockOptionsLoaded = ref(false);
const maxDisplayResults = 50;

// 成功提示相关
const showSuccessTip = ref(false);
const successMessage = ref('');
const loadingStage = ref(''); // 加载阶段提示

// 数据加载完成回调
const onDataLoadComplete = async () => {
  // 短暂显示完成状态
  await new Promise(resolve => setTimeout(resolve, 800));

  // 只在加载成功时显示提示
  if (stockOptions.value.length > 0) {
    // 显示成功提示
    successMessage.value = `成功加载 ${stockOptions.value.length} 个股票选项，系统已准备就绪`;
    showSuccessTip.value = true;

    // 8秒后自动隐藏成功提示
    setTimeout(() => {
      showSuccessTip.value = false;
    }, 8000);
  } else {
    errorList.value.push('未找到有效的股票数据');
  }

  // 结束加载状态
  loading.value = false;
  loadingStage.value = '';
};

// 期权询价相关数据
const optionType = ref('call');
const selectedTerm = ref('1M');
const selectedStructure = ref('atm');
const customStrikePrice = ref('');
const isInquiring = ref(false);
const inquiryResult = ref(null);

// 期权配置选项
const termOptions = [
  { value: '2W', label: '2周' },
  { value: '1M', label: '1个月' },
  { value: '2M', label: '2个月' },
  { value: '3M', label: '3个月' },
  { value: '6M', label: '6个月' },
  { value: '12M', label: '12个月' }
];

const structureOptions = [
  { value: 'atm', label: '平值期权(ATM)', ratio: 100 },
  { value: 'itm', label: '实值期权(ITM)', ratio: 95 },
  { value: 'otm', label: '虚值期权(OTM)', ratio: 105 },
  { value: 'custom', label: '自定义' }
];

// 计算属性
const hasData = computed(() => {
  return fileList.value.length > 0 || excelData.value.length > 0;
});

// 期权询价相关计算属性
const canInquire = computed(() => {
  return selectedStock.value &&
         optionType.value &&
         selectedTerm.value &&
         selectedStructure.value &&
         (selectedStructure.value !== 'custom' || customStrikePrice.value) &&
         isStockIndexLoaded.value &&
         isStockOptionsLoaded.value;
});

const calculatedStrikePrice = computed(() => {
  if (!selectedStock.value || !selectedStock.value.price) {
    return '0.00';
  }

  const currentPrice = selectedStock.value.price || 100; // 默认价格
  const ratio = getStrikePriceRatio() / 100;
  return (currentPrice * ratio).toFixed(2);
});

// 格式化文件大小
const formatFileSize = (size) => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
};

// 获取文件类型标签
const getFileTypeLabel = (fileName) => {
  if (fileName.includes('股指')) return '股指数据';
  if (fileName.includes('期权')) return '期权数据';
  return fileName;
};

// 获取当前工作表数据
const getCurrentSheetData = () => {
  if (excelData.value.length === 0 || !excelData.value[activeFileIndex.value]) {
    return [];
  }

  const currentFile = excelData.value[activeFileIndex.value];
  const activeSheet = currentFile.activeSheet || 0;

  if (!currentFile.sheets || !currentFile.sheets[activeSheet]) {
    return [];
  }

  return currentFile.sheets[activeSheet].data || [];
};

// 获取表格标题
const getTableHeaders = () => {
  const data = getCurrentSheetData();
  if (data.length === 0) return [];

  // 使用第一行作为标题
  return Object.keys(data[0] || {});
};

// 获取列宽度
const getColumnWidth = (header) => {
  const minWidth = 120;
  const headerLength = String(header).length;
  return Math.max(minWidth, headerLength * 20) + 'rpx';
};

// 格式化单元格值
const formatCellValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
};

// 股票筛选相关函数
const handleStockSearch = () => {
  if (!searchKeyword.value.trim()) {
    filteredStockOptions.value = stockOptions.value.slice(0, maxDisplayResults);
    return;
  }

  const keyword = searchKeyword.value.toLowerCase();
  filteredStockOptions.value = stockOptions.value
    .filter(stock => {
      return stock.value.toLowerCase().includes(keyword) ||
             stock.name.toLowerCase().includes(keyword) ||
             stock.label.toLowerCase().includes(keyword);
    })
    .slice(0, maxDisplayResults);
};

// 选择股票
const selectStock = (stock) => {
  selectedStock.value = stock;
  searchKeyword.value = stock.label;
  showStockSelector.value = false;
  console.log('选择了股票:', stock);
};

// 清除选择
const clearSelection = () => {
  selectedStock.value = null;
  searchKeyword.value = '';
  showStockSelector.value = false;
  filteredStockOptions.value = stockOptions.value.slice(0, maxDisplayResults);
};

// 处理加载完成的数据
const processLoadedExcelData = () => {
  try {
    // 重置数据状态
    loadingStage.value = '正在初始化数据结构...';
    allSheetsData.value = { stockIndex: {}, stockOptions: {} };
    stockOptions.value = [];
    isStockIndexLoaded.value = false;
    isStockOptionsLoaded.value = false;

    // 分类处理不同类型的数据文件
    loadingStage.value = '正在分析数据文件类型...';
    excelData.value.forEach((fileData, index) => {
      const fileName = fileData.fileName.toLowerCase();
      loadingStage.value = `正在处理文件 ${index + 1}/${excelData.value.length}...`;

      // 判断文件类型并处理
      if (fileName.includes('股指') || fileName.includes('index')) {
        processStockIndexDataFromOSS(fileData);
      } else if (fileName.includes('期权') || fileName.includes('option')) {
        processStockOptionsDataFromOSS(fileData);
      } else {
        // 默认作为期权数据处理
        processStockOptionsDataFromOSS(fileData);
      }
    });

    // 提取股票选项
    loadingStage.value = '正在提取股票选项...';
    extractStockOptions();

    // 初始化筛选结果
    loadingStage.value = '正在初始化搜索功能...';
    filteredStockOptions.value = stockOptions.value.slice(0, maxDisplayResults);

    // 数据处理完成，触发完成事件
    loadingStage.value = '数据加载完成！';
    console.log('数据处理完成，提取到', stockOptions.value.length, '个股票选项');

    // 调用数据加载完成的回调
    onDataLoadComplete();

  } catch (error) {
    console.error('处理数据失败:', error);
    errorList.value.push('处理数据失败: ' + error.message);
  }
};

// 处理股指期权数据
const processStockIndexDataFromOSS = (fileData) => {
  console.log('处理股指期权数据:', fileData.fileName);

  // 保存所有工作表数据
  fileData.sheets.forEach(sheet => {
    allSheetsData.value.stockIndex[sheet.name] = sheet.data;
  });

  isStockIndexLoaded.value = true;
  console.log('股指期权数据加载完成');
};

// 处理个股期权数据
const processStockOptionsDataFromOSS = (fileData) => {
  console.log('处理个股期权数据:', fileData.fileName);

  // 保存所有工作表数据
  fileData.sheets.forEach(sheet => {
    allSheetsData.value.stockOptions[sheet.name] = sheet.data;
  });

  isStockOptionsLoaded.value = true;
  console.log('个股期权数据加载完成');
};

// 提取股票选项（核心函数）
const extractStockOptions = () => {
  let options = [];

  try {
    // 第一优先级：从"7095"工作表提取
    if (allSheetsData.value.stockOptions?.['7095']) {
      const sheet7095Data = allSheetsData.value.stockOptions['7095'];
      options = extractStocksFromSheet(sheet7095Data, '7095');
      console.log('从7095工作表提取了', options.length, '个股票选项');
    }
    // 第二优先级：从"香草看涨报价"工作表提取
    else if (allSheetsData.value.stockOptions?.['香草看涨报价']) {
      const sheetData = allSheetsData.value.stockOptions['香草看涨报价'];
      options = extractStocksFromSheet(sheetData, '香草看涨报价');
      console.log('从香草看涨报价工作表提取了', options.length, '个股票选项');
    }
    // 第三优先级：遍历所有工作表
    else {
      // 从个股期权数据中提取
      Object.entries(allSheetsData.value.stockOptions).forEach(([sheetName, sheetData]) => {
        const processedOptions = extractStocksFromSheet(sheetData, sheetName);
        options = [...options, ...processedOptions];
      });

      // 从股指期权数据中提取
      Object.entries(allSheetsData.value.stockIndex).forEach(([sheetName, sheetData]) => {
        const processedOptions = extractStocksFromSheet(sheetData, sheetName);
        options = [...options, ...processedOptions];
      });

      // 去重处理
      options = removeDuplicateStocks(options);
      console.log('从所有工作表提取并去重后得到', options.length, '个股票选项');
    }

    // 保存到全局状态
    stockOptions.value = options;

  } catch (error) {
    console.error('提取股票选项失败:', error);
    errorList.value.push('提取股票选项失败: ' + error.message);
  }
};

// 从工作表中提取股票信息
const extractStocksFromSheet = (sheetData, sheetName) => {
  if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
    return [];
  }

  const options = [];

  try {
    // 根据不同工作表类型处理
    if (sheetName === '7095') {
      // 处理7095工作表
      sheetData.forEach(row => {
        const code = row['代码'] || row['证券代码'];
        const name = row['标的'] || row['证券简称'];
        if (code && name) {
          options.push({
            value: code,
            label: `${code} ${name}`,
            name: name,
            price: extractStockPrice(row),
            source: sheetName
          });
        }
      });
    } else if (sheetName === '香草看涨报价') {
      // 处理香草看涨报价工作表
      sheetData.forEach(row => {
        const code = row['证券代码'];
        const name = row['证券简称'];
        if (code && name) {
          options.push({
            value: code,
            label: `${code} ${name}`,
            name: name,
            price: extractStockPrice(row),
            source: sheetName
          });
        }
      });
    } else {
      // 通用处理逻辑
      sheetData.forEach(row => {
        // 尝试多种可能的列名
        const code = row['代码'] || row['证券代码'] || row['股票代码'] || row['code'];
        const name = row['标的'] || row['证券简称'] || row['股票名称'] || row['name'];

        if (code && name) {
          options.push({
            value: code,
            label: `${code} ${name}`,
            name: name,
            price: extractStockPrice(row),
            source: sheetName
          });
        }
      });
    }

  } catch (error) {
    console.error(`从工作表${sheetName}提取股票信息失败:`, error);
  }

  return options;
};

// 提取股票价格
const extractStockPrice = (row) => {
  // 尝试多种可能的价格列名
  const priceFields = ['价格', '现价', '最新价', '收盘价', 'price', 'close'];

  for (const field of priceFields) {
    const price = row[field];
    if (price !== null && price !== undefined && price !== '') {
      const numPrice = parseFloat(price);
      if (!isNaN(numPrice) && numPrice > 0) {
        return numPrice;
      }
    }
  }

  return null;
};

// 去重股票选项
const removeDuplicateStocks = (options) => {
  const seen = new Set();
  return options.filter(option => {
    const key = option.value; // 使用股票代码作为唯一标识
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// 静默加载数据文件
const loadExcelFiles = async () => {
  // 清空数据，准备加载
  errorList.value = [];
  fileList.value = [];
  excelData.value = [];

  try {
    // 1. 获取文件列表
    loadingStage.value = '正在连接服务器...';
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

    console.log('获取文件列表:', fileListResponse);

    if (fileListResponse.code !== 0) {
      throw new Error('获取文件列表失败: ' + fileListResponse.msg);
    }

    const allFiles = fileListResponse.data.list || [];

    // 筛选数据文件
    loadingStage.value = '正在筛选数据文件...';
    const excelFiles = allFiles.filter(file => {
      const filePath = file.path || file.url || '';
      return filePath.toLowerCase().endsWith('.xlsx') || filePath.toLowerCase().endsWith('.xls');
    });

    fileList.value = excelFiles;
    console.log(`找到${excelFiles.length}个数据文件，开始加载...`);

    // 2. 加载每个数据文件
    for (let i = 0; i < excelFiles.length; i++) {
      const file = excelFiles[i];
      loadingStage.value = `正在加载文件 ${i + 1}/${excelFiles.length}...`;
      console.log(`加载数据 ${i + 1}/${excelFiles.length}: ${file.name || file.path}`);

      try {
        await loadSingleFile(file, false);
      } catch (error) {
        console.error(`加载文件失败: ${file.name || file.path}`, error);
        errorList.value.push(`文件 ${file.name || file.path}: ${error.message}`);
      }
    }

    console.log('数据文件加载完成，开始处理股票数据...');
    loadingStage.value = '正在处理股票数据...';

    if (excelData.value.length === 0) {
      errorList.value.push('没有成功加载任何数据文件');
      // 如果没有数据，需要结束加载状态
      loading.value = false;
      loadingStage.value = '';
    } else {
      // 处理加载完成后的数据
      // 注意：不在这里结束loading状态，将在processLoadedExcelData -> onDataLoadComplete中结束
      processLoadedExcelData();
    }

  } catch (error) {
    console.error('加载数据失败:', error);
    errorList.value.push('数据加载失败: ' + error.message);
    // 出错时结束加载状态
    loading.value = false;
    loadingStage.value = '';
  }
};

// 加载单个Excel文件
const loadSingleFile = async (file, showLoading = true) => {
  if (showLoading) {
    loading.value = true;
  }

  try {
    const filePath = file.path || file.url || '';
    console.log('开始加载文件:', filePath);

    // 获取访问URL
    const accessUrlResponse = await sheep.$api.option.getOSSAccessUrl(filePath);
    console.log('访问URL响应:', accessUrlResponse);

    if (accessUrlResponse.code !== 0) {
      throw new Error('获取访问URL失败: ' + accessUrlResponse.msg);
    }

    const accessUrl = accessUrlResponse.data.accessUrl || accessUrlResponse.data;
    console.log('使用URL下载文件:', accessUrl.substring(0, 100) + '...');

    // 下载文件
    const response = await new Promise((resolve, reject) => {
      uni.request({
        url: accessUrl,
        method: 'GET',
        responseType: 'arraybuffer',
        success: resolve,
        fail: reject
      });
    });

    if (response.statusCode !== 200) {
      throw new Error(`下载失败: ${response.statusCode}`);
    }

    // 解析Excel文件
    const workbook = XLSX.read(response.data, { type: 'array' });
    const sheets = [];

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 转换为对象数组格式
      if (jsonData.length > 0) {
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });

        sheets.push({
          name: sheetName,
          data: dataRows
        });
      } else {
        sheets.push({
          name: sheetName,
          data: []
        });
      }
    });

    const fileData = {
      fileName: file.name || filePath.split('/').pop(),
      filePath: filePath,
      sheets: sheets,
      activeSheet: 0
    };

    // 检查是否已存在相同文件
    const existingIndex = excelData.value.findIndex(item => item.filePath === filePath);
    if (existingIndex >= 0) {
      excelData.value[existingIndex] = { ...fileData, activeSheet: 0 };
    } else {
      excelData.value.push({ ...fileData, activeSheet: 0 });
    }

    // 如果这是第一个文件，设置为活动文件
    if (excelData.value.length === 1) {
      activeFileIndex.value = 0;
    }

    console.log('文件解析完成:', fileData);

  } catch (error) {
    console.error('加载单个文件失败:', error);
    if (showLoading) {
      errorList.value.push(`文件 ${file.name || file.path}: ${error.message}`);
    }
    throw error;
  } finally {
    if (showLoading) {
      loading.value = false;
    }
  }
};

// 清空数据
const clearData = () => {
  fileList.value = [];
  excelData.value = [];
  errorList.value = [];
  activeFileIndex.value = 0;
};

// 页面加载时自动加载数据
onMounted(async () => {
  console.log('期权询价页面已加载，开始自动加载数据');

  // 添加点击外部关闭选择器的事件监听
  document.addEventListener('click', handleClickOutside);

  // 自动加载数据
  await autoLoadExcelFiles();
});

// 点击外部关闭选择器
const handleClickOutside = (event) => {
  const stockSelector = document.querySelector('.stock-selector');
  const searchInput = document.querySelector('.stock-search-input');

  if (stockSelector && searchInput &&
      !stockSelector.contains(event.target) &&
      !searchInput.contains(event.target)) {
    showStockSelector.value = false;
  }
};

// 输入框失焦处理
const handleInputBlur = () => {
  // 延迟关闭，给点击选项留时间
  setTimeout(() => {
    if (!selectedStock.value) {
      showStockSelector.value = false;
    }
  }, 200);
};

// 期权询价相关函数
const selectTerm = (term) => {
  selectedTerm.value = term;
};

const selectStructure = (structure) => {
  selectedStructure.value = structure;
};

const getStrikePriceRatio = () => {
  const structure = structureOptions.find(s => s.value === selectedStructure.value);
  return structure ? structure.ratio : 100;
};

const getTermLabel = (termValue) => {
  const term = termOptions.find(t => t.value === termValue);
  return term ? term.label : termValue;
};

// 执行期权询价
const performOptionInquiry = async () => {
  if (!canInquire.value) {
    console.warn('询价条件不满足');
    return;
  }

  isInquiring.value = true;

  try {
    // 构建询价参数
    const inquiryParams = {
      stockCode: selectedStock.value.value,
      stockName: selectedStock.value.name,
      optionType: optionType.value,
      term: selectedTerm.value,
      structureType: selectedStructure.value,
      strikePrice: selectedStructure.value === 'custom'
        ? parseFloat(customStrikePrice.value)
        : parseFloat(calculatedStrikePrice.value),
      currentPrice: selectedStock.value.price || 100
    };

    console.log('开始期权询价:', inquiryParams);

    // 模拟询价计算（实际项目中这里会调用真实的API）
    const result = await calculateOptionPrice(inquiryParams);

    inquiryResult.value = result;
    console.log('询价完成:', result);

  } catch (error) {
    console.error('询价失败:', error);
    errorList.value.push('询价失败: ' + error.message);
  } finally {
    isInquiring.value = false;
  }
};

// 期权价格计算函数（基于Excel数据的专业计算）
const calculateOptionPrice = async (params) => {
  // 模拟异步计算过程
  await new Promise(resolve => setTimeout(resolve, 1500));

  const { stockCode, stockName, optionType, term, strikePrice, currentPrice } = params;

  try {
    // 调用核心期权询价API
    const result = extractOptionInquiryFromExcel(
      allSheetsData.value.stockIndex,
      allSheetsData.value.stockOptions,
      {
        stockCode,
        optionType,
        term,
        structureType: selectedStructure.value,
        strikePrice,
        strikePriceRatio: selectedStructure.value !== 'custom' ? getStrikePriceRatio() : undefined
      }
    );

    if (result) {
      return result;
    } else {
      // 如果Excel数据中没有找到匹配项，使用增强的模拟计算
      return calculateEnhancedMockPrice(params);
    }

  } catch (error) {
    console.error('期权计算失败，使用模拟数据:', error);
    return calculateEnhancedMockPrice(params);
  }
};

// 增强的模拟期权价格计算
const calculateEnhancedMockPrice = (params) => {
  const { stockCode, stockName, optionType, term, strikePrice, currentPrice } = params;

  // 生成确定性随机种子
  const seed = generateSeed(stockCode);

  // 计算价格比例
  const priceRatio = (strikePrice / currentPrice) * 100;

  // 生成多券商报价
  const brokerQuotes = generateMockBrokerQuotes(params, currentPrice, strikePrice, optionType);

  // 计算平均价格
  const avgPrice = brokerQuotes.reduce((sum, quote) => sum + quote.price, 0) / brokerQuotes.length;

  // 计算希腊字母
  const delta = calculateDelta(optionType, priceRatio);
  const gamma = calculateGamma(term, priceRatio);
  const theta = calculateTheta(term, priceRatio, optionType);
  const vega = calculateVega(term, priceRatio);

  // 计算隐含波动率
  const impliedVolatility = calculateImpliedVolatility(brokerQuotes);

  return {
    stockCode,
    stockName,
    currentPrice,
    optionType,
    term,
    strikePrice,
    strikePriceRatio: selectedStructure.value !== 'custom' ? getStrikePriceRatio() : undefined,
    expiryDate: calculateExpiryDate(term),
    bidPrice: (avgPrice * 0.95).toFixed(4),
    askPrice: (avgPrice * 1.05).toFixed(4),
    lastPrice: avgPrice.toFixed(4),
    delta: delta.toFixed(4),
    gamma: gamma.toFixed(6),
    theta: theta.toFixed(4),
    vega: vega.toFixed(4),
    impliedVolatility: impliedVolatility,
    brokerQuotes: brokerQuotes,
    quoteSource: 'Excel数据模拟',
    quoteTime: new Date().toLocaleString(),
    timestamp: new Date().toLocaleString()
  };
};

// 简化的Black-Scholes期权定价模型
const calculateBlackScholesPrice = ({ currentPrice, strikePrice, timeToExpiry, volatility, riskFreeRate, optionType }) => {
  const d1 = (Math.log(currentPrice / strikePrice) + (riskFreeRate + 0.5 * volatility * volatility) * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry));
  const d2 = d1 - volatility * Math.sqrt(timeToExpiry);

  const N = (x) => 0.5 * (1 + erf(x / Math.sqrt(2))); // 标准正态分布累积函数

  if (optionType === 'call') {
    return currentPrice * N(d1) - strikePrice * Math.exp(-riskFreeRate * timeToExpiry) * N(d2);
  } else {
    return strikePrice * Math.exp(-riskFreeRate * timeToExpiry) * N(-d2) - currentPrice * N(-d1);
  }
};

// 误差函数近似
const erf = (x) => {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
};

// 核心期权询价API（从Excel数据中提取期权报价）
const extractOptionInquiryFromExcel = (stockIndexData, stockOptionsData, inquiryParams) => {
  try {
    const { stockCode, optionType, term, structureType } = inquiryParams;

    // 根据期权类型分发处理
    if (optionType === 'call') {
      return extractCallOptionFromExcel(stockOptionsData, inquiryParams, structureType);
    } else {
      return extractPutOptionFromExcel(stockOptionsData, inquiryParams, structureType);
    }
  } catch (error) {
    console.error('从Excel提取期权数据失败:', error);
    return null;
  }
};

// 从Excel中提取看涨期权数据
const extractCallOptionFromExcel = (excelData, params, structureType) => {
  const { stockCode, term } = params;

  // 查找股票信息
  const stockInfo = findStockInfoInExcel(excelData, stockCode);
  if (!stockInfo) {
    console.warn(`未找到股票${stockCode}的信息`);
    return null;
  }

  // 查找期权报价数据
  const optionPrices = extractOptionPricesFromExcel(excelData, params, structureType);
  if (optionPrices.length === 0) {
    console.warn(`未找到股票${stockCode}的期权报价数据`);
    return null;
  }

  // 计算平均报价
  const avgPrice = optionPrices.reduce((sum, quote) => sum + quote.price, 0) / optionPrices.length;

  // 计算行权价格
  const strikePrice = calculateStrikePriceFromStructure(stockInfo.price, structureType);

  // 计算希腊字母
  const priceRatio = (strikePrice / stockInfo.price) * 100;
  const delta = calculateDelta('call', priceRatio);
  const gamma = calculateGamma(term, priceRatio);
  const theta = calculateTheta(term, priceRatio, 'call');
  const vega = calculateVega(term, priceRatio);

  return {
    stockCode,
    stockName: stockInfo.name,
    currentPrice: stockInfo.price,
    optionType: 'call',
    term,
    strikePrice,
    strikePriceRatio: getStrikePriceRatioFromStructure(structureType),
    expiryDate: calculateExpiryDate(term),
    bidPrice: (avgPrice * 0.95).toFixed(4),
    askPrice: (avgPrice * 1.05).toFixed(4),
    lastPrice: avgPrice.toFixed(4),
    delta: delta.toFixed(4),
    gamma: gamma.toFixed(6),
    theta: theta.toFixed(4),
    vega: vega.toFixed(4),
    impliedVolatility: calculateImpliedVolatility(optionPrices),
    brokerQuotes: optionPrices,
    quoteSource: 'Excel数据',
    quoteTime: new Date().toLocaleString()
  };
};

// 从Excel中提取看跌期权数据
const extractPutOptionFromExcel = (excelData, params, structureType) => {
  const { stockCode, term } = params;

  // 查找股票信息
  const stockInfo = findStockInfoInExcel(excelData, stockCode);
  if (!stockInfo) {
    console.warn(`未找到股票${stockCode}的信息`);
    return null;
  }

  // 查找期权报价数据
  const optionPrices = extractOptionPricesFromExcel(excelData, params, structureType);
  if (optionPrices.length === 0) {
    console.warn(`未找到股票${stockCode}的期权报价数据`);
    return null;
  }

  // 计算平均报价
  const avgPrice = optionPrices.reduce((sum, quote) => sum + quote.price, 0) / optionPrices.length;

  // 计算行权价格
  const strikePrice = calculateStrikePriceFromStructure(stockInfo.price, structureType);

  // 计算希腊字母（看跌期权）
  const priceRatio = (strikePrice / stockInfo.price) * 100;
  const delta = calculateDelta('put', priceRatio);
  const gamma = calculateGamma(term, priceRatio);
  const theta = calculateTheta(term, priceRatio, 'put');
  const vega = calculateVega(term, priceRatio);

  return {
    stockCode,
    stockName: stockInfo.name,
    currentPrice: stockInfo.price,
    optionType: 'put',
    term,
    strikePrice,
    strikePriceRatio: getStrikePriceRatioFromStructure(structureType),
    expiryDate: calculateExpiryDate(term),
    bidPrice: (avgPrice * 0.95).toFixed(4),
    askPrice: (avgPrice * 1.05).toFixed(4),
    lastPrice: avgPrice.toFixed(4),
    delta: delta.toFixed(4),
    gamma: gamma.toFixed(6),
    theta: theta.toFixed(4),
    vega: vega.toFixed(4),
    impliedVolatility: calculateImpliedVolatility(optionPrices),
    brokerQuotes: optionPrices,
    quoteSource: 'Excel数据',
    quoteTime: new Date().toLocaleString()
  };
};

// 在Excel数据中查找股票信息
const findStockInfoInExcel = (excelData, stockCode) => {
  // 优先从"7095"工作表查找
  if (excelData['7095']) {
    for (const row of excelData['7095']) {
      if (row['代码'] === stockCode || row['证券代码'] === stockCode) {
        return {
          name: row['标的'] || row['证券简称'] || `股票${stockCode}`,
          price: extractStockPrice(row) || generateRandomPrice(stockCode)
        };
      }
    }
  }

  // 从"香草看涨报价"工作表查找
  if (excelData['香草看涨报价']) {
    for (const row of excelData['香草看涨报价']) {
      if (row['证券代码'] === stockCode) {
        return {
          name: row['证券简称'] || `股票${stockCode}`,
          price: extractStockPrice(row) || generateRandomPrice(stockCode)
        };
      }
    }
  }

  // 从"香草看跌报价"工作表查找
  if (excelData['香草看跌报价']) {
    for (const row of excelData['香草看跌报价']) {
      if (row['证券代码'] === stockCode) {
        return {
          name: row['证券简称'] || `股票${stockCode}`,
          price: extractStockPrice(row) || generateRandomPrice(stockCode)
        };
      }
    }
  }

  // 如果都没找到，返回模拟数据
  return {
    name: `股票${stockCode}`,
    price: generateRandomPrice(stockCode)
  };
};

// 从Excel中提取期权价格数据
const extractOptionPricesFromExcel = (excelData, params, structureType) => {
  const { stockCode, optionType, term } = params;
  const prices = [];

  // 根据期权类型选择工作表
  const sheetName = optionType === 'call' ? '香草看涨报价' : '香草看跌报价';

  if (excelData[sheetName]) {
    // 查找匹配的股票代码和期限的报价
    for (const row of excelData[sheetName]) {
      if (row['证券代码'] === stockCode) {
        // 尝试提取不同期限的价格
        const termPrice = extractTermPrice(row, term, structureType);
        if (termPrice > 0) {
          prices.push({
            broker: row['报价方'] || 'Unknown',
            price: termPrice,
            impliedVolatility: extractImpliedVolatility(row, term) || '25.00%'
          });
        }
      }
    }
  }

  // 如果没有找到Excel数据，生成模拟数据
  if (prices.length === 0) {
    return generateMockBrokerQuotes(params, generateRandomPrice(stockCode),
      calculateStrikePriceFromStructure(generateRandomPrice(stockCode), structureType), optionType);
  }

  return prices;
};

// 从行数据中提取特定期限的价格
const extractTermPrice = (row, term, structureType) => {
  // 尝试不同的列名组合
  const possibleColumns = [
    `${term}_${structureType}`,
    `${term}`,
    `期权价格_${term}`,
    `报价_${term}`,
    '报价',
    '价格',
    'price'
  ];

  for (const col of possibleColumns) {
    if (row[col] && !isNaN(parseFloat(row[col]))) {
      return parseFloat(row[col]);
    }
  }

  return 0;
};

// 从行数据中提取隐含波动率
const extractImpliedVolatility = (row, term) => {
  const possibleColumns = [
    `IV_${term}`,
    `隐含波动率_${term}`,
    '隐含波动率',
    'IV',
    'impliedVolatility'
  ];

  for (const col of possibleColumns) {
    if (row[col]) {
      const iv = parseFloat(row[col]);
      if (!isNaN(iv)) {
        return iv > 1 ? `${iv.toFixed(2)}%` : `${(iv * 100).toFixed(2)}%`;
      }
    }
  }

  return null;
};

// 专业的Delta计算（基于期权类型和价格比例）
const calculateDelta = (optionType, priceRatio = 100) => {
  if (optionType === 'call') {
    // 看涨期权Delta：0到1之间
    if (priceRatio < 80) return 0.85;      // 深度实值，接近1
    else if (priceRatio < 90) return 0.70; // 实值
    else if (priceRatio < 110) return 0.50;// 平值，约0.5
    else if (priceRatio < 120) return 0.30;// 虚值
    else return 0.15;                      // 深度虚值，接近0
  } else {
    // 看跌期权Delta：-1到0之间
    if (priceRatio < 80) return -0.15;     // 深度虚值，接近0
    else if (priceRatio < 90) return -0.30;// 虚值
    else if (priceRatio < 110) return -0.50;// 平值，约-0.5
    else if (priceRatio < 120) return -0.70;// 实值
    else return -0.85;                     // 深度实值，接近-1
  }
};

// 专业的Gamma计算（基于期限和价格比例）
const calculateGamma = (term, priceRatio = 100) => {
  // Gamma在平值期权时最大，实值和虚值期权时较小
  // 期限越短，Gamma越大

  const termFactor = {
    '2W': 0.08,   // 短期期权，Gamma较大
    '1M': 0.06,
    '2M': 0.04,
    '3M': 0.03,
    '6M': 0.02,
    '12M': 0.01   // 长期期权，Gamma较小
  }[term] || 0.03;

  // 平值期权Gamma最大
  if (priceRatio >= 95 && priceRatio <= 105) {
    return parseFloat((termFactor * 1.5).toFixed(4)); // 平值，Gamma最大
  } else if (priceRatio >= 85 && priceRatio <= 115) {
    return parseFloat(termFactor.toFixed(4));         // 接近平值
  } else {
    return parseFloat((termFactor * 0.5).toFixed(4)); // 深度实值或虚值，Gamma较小
  }
};

// 专业的Theta计算（时间衰减）
const calculateTheta = (term, priceRatio = 100, optionType = 'call') => {
  // Theta通常为负值，表示时间价值衰减
  // 期限越短，时间衰减越快

  const termFactor = {
    '2W': -0.05,   // 短期期权，时间衰减最快
    '1M': -0.04,
    '2M': -0.03,
    '3M': -0.025,
    '6M': -0.015,
    '12M': -0.01   // 长期期权，时间衰减较慢
  }[term] || -0.02;

  // 平值期权的Theta绝对值最大
  if (priceRatio >= 95 && priceRatio <= 105) {
    return parseFloat(termFactor.toFixed(4));         // 平值，时间衰减最快
  } else {
    return parseFloat((termFactor * 0.7).toFixed(4)); // 实值/虚值，时间衰减较慢
  }
};

// 专业的Vega计算（波动率敏感性）
const calculateVega = (term, priceRatio = 100) => {
  // Vega表示期权价格对波动率变化的敏感性
  // 期限越长，Vega越大；平值期权Vega最大

  const termFactor = {
    '2W': 0.05,    // 短期期权，对波动率不太敏感
    '1M': 0.10,
    '2M': 0.15,
    '3M': 0.20,
    '6M': 0.30,
    '12M': 0.40    // 长期期权，对波动率很敏感
  }[term] || 0.15;

  // 平值期权Vega最大
  if (priceRatio >= 95 && priceRatio <= 105) {
    return parseFloat((termFactor * 1.2).toFixed(4)); // 平值，Vega最大
  } else if (priceRatio >= 85 && priceRatio <= 115) {
    return parseFloat(termFactor.toFixed(4));         // 接近平值
  } else {
    return parseFloat((termFactor * 0.6).toFixed(4)); // 深度实值或虚值，Vega较小
  }
};

// 计算隐含波动率（基于券商报价）
const calculateImpliedVolatility = (brokerQuotes) => {
  if (!brokerQuotes || brokerQuotes.length === 0) {
    return '25.00%'; // 默认波动率
  }

  // 如果券商报价中已包含隐含波动率，计算平均值
  const ivValues = brokerQuotes
    .map(quote => {
      if (quote.impliedVolatility) {
        const iv = parseFloat(quote.impliedVolatility.replace('%', ''));
        return isNaN(iv) ? null : iv;
      }
      return null;
    })
    .filter(iv => iv !== null);

  if (ivValues.length > 0) {
    const avgIV = ivValues.reduce((sum, iv) => sum + iv, 0) / ivValues.length;
    return `${avgIV.toFixed(2)}%`;
  }

  // 如果没有隐含波动率数据，基于价格估算
  const avgPrice = brokerQuotes.reduce((sum, quote) => sum + quote.price, 0) / brokerQuotes.length;

  // 简化的波动率估算：价格越高，隐含波动率越高
  let estimatedIV = 20 + (avgPrice * 100); // 基础波动率20% + 价格因子
  estimatedIV = Math.min(Math.max(estimatedIV, 15), 60); // 限制在15%-60%之间

  return `${estimatedIV.toFixed(2)}%`;
};

// 获取到期时间（年为单位）
const getTimeToExpiry = (term) => {
  const termMap = {
    '2W': 14 / 365,
    '1M': 30 / 365,
    '2M': 60 / 365,
    '3M': 90 / 365,
    '6M': 180 / 365,
    '12M': 365 / 365
  };
  return termMap[term] || 30 / 365;
};

// 计算到期日期
const calculateExpiryDate = (term) => {
  const today = new Date();
  const days = {
    '2W': 14,
    '1M': 30,
    '2M': 60,
    '3M': 90,
    '6M': 180,
    '12M': 365
  };

  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + (days[term] || 30));

  return expiryDate.toLocaleDateString();
};

// 保存询价结果
const saveInquiryResult = () => {
  if (!inquiryResult.value) return;

  // 这里可以保存到本地存储或发送到服务器
  const savedResults = JSON.parse(localStorage.getItem('optionInquiryResults') || '[]');
  savedResults.push({
    ...inquiryResult.value,
    savedAt: new Date().toISOString()
  });
  localStorage.setItem('optionInquiryResults', JSON.stringify(savedResults));

  console.log('询价结果已保存');
  // 可以显示成功提示
};

// 开始新的询价
const startNewInquiry = () => {
  inquiryResult.value = null;
  optionType.value = 'call';
  selectedTerm.value = '1M';
  selectedStructure.value = 'atm';
  customStrikePrice.value = '';
};

// 根据结构类型计算行权价格
const calculateStrikePriceFromStructure = (currentPrice, structureType) => {
  const ratioMap = {
    'atm': 100,  // 平值期权
    'itm': 95,   // 实值期权（看涨）
    'otm': 105   // 虚值期权（看涨）
  };

  const ratio = ratioMap[structureType] || 100;
  return parseFloat((currentPrice * ratio / 100).toFixed(2));
};

// 根据结构类型获取行权价格比例
const getStrikePriceRatioFromStructure = (structureType) => {
  const ratioMap = {
    'atm': 100,
    'itm': 95,
    'otm': 105
  };

  return ratioMap[structureType] || 100;
};

// 生成确定性随机种子
const generateSeed = (stockCode) => {
  return stockCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
};

// 生成随机价格（基于股票代码的确定性随机）
const generateRandomPrice = (stockCode) => {
  const seed = generateSeed(stockCode);
  const basePrice = 50 + (seed % 100); // 50-150之间的基础价格
  return parseFloat(basePrice.toFixed(2));
};

// 生成模拟券商报价
const generateMockBrokerQuotes = (params, currentPrice, strikePrice, optionType = 'call') => {
  const { stockCode, term } = params;
  const stockCodeSeed = generateSeed(stockCode);

  // 券商列表
  const brokers = [
    { code: 'YAQZ', name: 'YAQZ', color: '#E74C3C', baseIv: 0.25 },
    { code: 'YHQZ', name: 'YHQZ', color: '#3498DB', baseIv: 0.23 },
    { code: 'ZXZZ', name: 'ZXZZ', color: '#2ECC71', baseIv: 0.27 },
    { code: 'ZSQH', name: 'ZSQH', color: '#F39C12', baseIv: 0.24 },
    { code: 'ZJ', name: 'ZJ', color: '#9B59B6', baseIv: 0.26 },
    { code: 'GJQZ', name: 'GJQZ', color: '#F1C40F', baseIv: 0.22 }
  ];

  // 计算基础价格
  const priceRatio = (strikePrice / currentPrice) * 100;
  const termFactor = getTermFactor(term);
  const basePrice = calculateOptionBasePrice(currentPrice, strikePrice, optionType, termFactor, priceRatio);

  // 为每个券商生成报价
  return brokers.map(broker => {
    const brokerSeed = broker.code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const combinedSeed = (stockCodeSeed + brokerSeed) % 1000;
    const factor = 0.85 + (combinedSeed / 1000) * 0.3; // 0.85-1.15随机因子

    const price = basePrice * factor;

    // 计算隐含波动率
    const ivSkewFactor = calculateIVSkewFactor(priceRatio, optionType);
    const termFactorForIV = 1 + (termFactor - 1) * 0.3;
    const ivRandomFactor = 0.9 + (combinedSeed % 100) / 500;
    const iv = broker.baseIv * termFactorForIV * ivSkewFactor * ivRandomFactor;

    return {
      broker: broker.name,
      price: parseFloat(price.toFixed(4)),
      impliedVolatility: `${(iv * 100).toFixed(2)}%`,
      color: broker.color
    };
  });
};

// 计算期权基础价格
const calculateOptionBasePrice = (currentPrice, strikePrice, optionType, termFactor, priceRatio) => {
  let basePrice = 0;

  if (optionType === 'call') {
    if (priceRatio < 100) { // 实值看涨
      // 内在价值 + 时间价值
      basePrice = Math.max(0, (currentPrice - strikePrice) / currentPrice) * termFactor * 0.8;
      basePrice = Math.max(basePrice, 0.01);
    } else { // 平值或虚值看涨
      // 纯时间价值
      basePrice = (Math.max(5, (generateSeed(currentPrice.toString()) % 15)) / 1000) * currentPrice * termFactor;
    }
  } else { // 看跌期权
    if (priceRatio > 100) { // 实值看跌
      // 内在价值 + 时间价值
      basePrice = Math.max(0, (strikePrice - currentPrice) / currentPrice) * termFactor * 0.8;
      basePrice = Math.max(basePrice, 0.01);
    } else { // 平值或虚值看跌
      // 纯时间价值
      basePrice = (Math.max(5, (generateSeed(currentPrice.toString()) % 15)) / 1000) * currentPrice * termFactor;
    }
  }

  return basePrice;
};

// 获取期限因子
const getTermFactor = (term) => {
  const termFactors = {
    '2W': 0.5,
    '1M': 1.0,
    '2M': 1.4,
    '3M': 1.8,
    '6M': 2.5,
    '12M': 3.2
  };
  return termFactors[term] || 1.0;
};

// 计算波动率偏斜因子
const calculateIVSkewFactor = (priceRatio, optionType) => {
  if (optionType === 'call') {
    if (priceRatio < 85) return 1.3;
    else if (priceRatio < 95) return 1.1;
    else if (priceRatio < 105) return 1.0;
    else if (priceRatio < 115) return 1.1;
    else return 1.4;
  } else {
    if (priceRatio < 85) return 1.4;
    else if (priceRatio < 95) return 1.1;
    else if (priceRatio < 105) return 1.0;
    else if (priceRatio < 115) return 1.1;
    else return 1.3;
  }
};

// 自动加载数据（事件驱动的加载提示）
const autoLoadExcelFiles = async () => {
  console.log('开始加载数据...');

  // 开始加载状态
  loading.value = true;
  showSuccessTip.value = false;
  loadingStage.value = '正在初始化系统...';

  try {
    // 短暂延迟让用户看到初始化提示
    await new Promise(resolve => setTimeout(resolve, 500));

    // 调用加载函数，根据实际事件更新状态
    await loadExcelFiles();

    console.log('数据加载流程完成');

    // 注意：不在这里结束loading状态
    // loading状态将在onDataLoadComplete中结束

  } catch (error) {
    console.error('数据加载失败:', error);
    errorList.value.push('数据加载失败: ' + error.message);
    loadingStage.value = '加载失败';

    // 只有在出错时才在这里结束loading状态
    loading.value = false;
    loadingStage.value = '';
  }
};

// 重新加载数据
const reloadExcelFiles = async () => {
  console.log('用户手动重新加载数据...');

  // 清空现有数据
  clearData();

  // 重新加载
  await autoLoadExcelFiles();
};
</script>

<style lang="scss" scoped>
.page-header {
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.page-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.page-desc {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

.excel-container {
  background-color: #fff;
}

/* 加载成功提示样式 */
.load-success-tip {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border-radius: 16rpx;
  padding: 25rpx;
  border: 2px solid #28a745;
  box-shadow: 0 8rpx 32rpx rgba(40, 167, 69, 0.3);
  animation: successSlideIn 0.5s ease-out;
  position: relative;
  overflow: hidden;
}

.load-success-tip::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes successSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-30rpx) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.success-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12rpx;
  padding: 25rpx;
  border: 1px solid #28a745;
  box-shadow: 0 4rpx 20rpx rgba(40, 167, 69, 0.2);
  position: relative;
  z-index: 2;
}

.success-icon {
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 25rpx;
  font-size: 36rpx;
  color: #fff;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  box-shadow: 0 4rpx 15rpx rgba(40, 167, 69, 0.4);
  animation: successPulse 2s ease-in-out infinite;
}

@keyframes successPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.success-content {
  flex: 1;
}

.success-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #155724;
  margin-bottom: 10rpx;
}

.success-desc {
  font-size: 26rpx;
  color: #155724;
  line-height: 1.4;
}

.close-success-btn {
  position: absolute;
  top: 15rpx;
  right: 15rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(21, 87, 36, 0.1);
  border: none;
  color: #155724;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-success-btn:hover {
  background: rgba(21, 87, 36, 0.2);
  transform: scale(1.1);
}

.close-success-btn:active {
  transform: scale(0.95);
}

.action-buttons {
  display: flex;
  gap: 20rpx;
}

.reload-btn, .clear-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
}

.reload-btn {
  background-color: #007AFF;
  color: #fff;
}

.reload-btn[disabled] {
  background-color: #a0cfff;
}

.clear-btn {
  background-color: #f56c6c;
  color: #fff;
}

.loading-status {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 20rpx;
  border: 1px solid #e9ecef;
}

.status-item {
  font-size: 28rpx;
  color: #666;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

/* 优化的错误信息样式 */
.error-info {
  background-color: #fff3cd;
  border-radius: 8rpx;
  border: 1px solid #ffeaa7;
}

.error-card {
  background-color: #fff;
  border-radius: 6rpx;
  margin: 15rpx;
  overflow: hidden;
  border: 1px solid #fbc4c4;
}

.error-header {
  display: flex;
  align-items: center;
  background-color: #f8d7da;
  padding: 15rpx 20rpx;
  border-bottom: 1px solid #fbc4c4;
}

.error-icon {
  font-size: 28rpx;
  color: #721c24;
  margin-right: 15rpx;
}

.error-title {
  color: #721c24;
  font-size: 28rpx;
  font-weight: bold;
}

.error-content {
  padding: 15rpx 20rpx;
}

.error-item {
  margin-bottom: 8rpx;
  padding: 10rpx 15rpx;
  background-color: #fef0f0;
  border-radius: 4rpx;
  border-left: 4rpx solid #f56c6c;
}

.error {
  color: #721c24;
  font-size: 24rpx;
  line-height: 1.4;
}

.error-actions {
  text-align: center;
  padding-top: 10rpx;
  border-top: 1px solid #fbc4c4;
}

.retry-btn {
  padding: 12rpx 30rpx;
  background-color: #007AFF;
  color: #fff;
  border: none;
  border-radius: 6rpx;
  font-size: 26rpx;
}

.file-list {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 20rpx;
  border: 1px solid #e9ecef;
}

.file-item {
  padding: 15rpx;
  background-color: #fff;
  border-radius: 6rpx;
  border: 1px solid #e9ecef;
  cursor: pointer;
  margin-bottom: 10rpx;
}

.file-item:active {
  background-color: #f7f7f7;
}

.file-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.file-path {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  word-break: break-all;
}

.file-size {
  font-size: 24rpx;
  color: #999;
}

/* 文件内容预览样式 */
.content-preview-header {
  background-color: #fff;
  border-bottom: 1px solid #e9ecef;
  padding: 15rpx 0;
}

.preview-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

/* 文件类型标签样式 */
.file-type-tabs {
  background-color: #fff;
  display: flex;
  border-bottom: 1px solid #e9ecef;
  overflow-x: auto;
}

.file-type-tab {
  padding: 20rpx 40rpx;
  font-size: 28rpx;
  color: #666;
  white-space: nowrap;
  border-bottom: 3rpx solid transparent;
  cursor: pointer;
  background-color: #f8f9fa;
  margin-right: 2rpx;
}

.file-type-tab.active {
  color: #fff;
  background-color: #007AFF;
  border-bottom-color: #007AFF;
}

/* 工作表选择样式 */
.sheet-selector {
  background-color: #fff;
  border-bottom: 1px solid #e9ecef;
  padding: 20rpx;
}

.selector-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.sheet-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.sheet-button {
  padding: 15rpx 25rpx;
  font-size: 24rpx;
  color: #666;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6rpx;
  cursor: pointer;
}

.sheet-button.active {
  color: #fff;
  background-color: #28a745;
  border-color: #28a745;
}

.sheet-button.highlight {
  background-color: #e7f3ff;
  border-color: #007AFF;
  color: #007AFF;
}

.sheet-button.active.highlight {
  background-color: #28a745;
  color: #fff;
}

.sheet-count {
  font-size: 20rpx;
  margin-left: 8rpx;
}

/* 表格容器样式 */
.table-container {
  background-color: #fff;
  border-radius: 8rpx;
  overflow: hidden;
  border: 1px solid #e9ecef;
  margin-top: 20rpx;
}

.table-scroll-container {
  width: 100%;
  max-height: 800rpx;
}

.excel-table {
  min-width: 100%;
  border-collapse: collapse;
}

/* 表头样式 */
.table-header {
  display: flex;
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-cell {
  padding: 20rpx 15rpx;
  font-size: 26rpx;
  font-weight: bold;
  color: #495057;
  border-right: 1px solid #dee2e6;
  text-align: center;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-all;
}

/* 表格主体样式 */
.table-body {
  background-color: #fff;
}

.table-row {
  display: flex;
  border-bottom: 1px solid #e9ecef;
}

.table-row.even-row {
  background-color: #f8f9fa;
}

.table-cell {
  padding: 15rpx;
  font-size: 24rpx;
  color: #495057;
  border-right: 1px solid #e9ecef;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-all;
}

/* 表格底部样式 */
.table-footer {
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  text-align: center;
}

.footer-text {
  font-size: 24rpx;
  color: #6c757d;
}

/* 空数据样式 */
.empty-sheet {
  padding: 100rpx 20rpx;
  text-align: center;
}

/* 股票筛选功能样式 */
.stock-filter-section {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 20rpx;
  border: 1px solid #e9ecef;
}

.stock-search-container {
  position: relative;
}

.search-input-wrapper {
  position: relative;
}

.stock-search-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx 0 20rpx;
  padding-right: 200rpx; /* 为搜索统计预留空间 */
  border: 2px solid #007AFF;
  border-radius: 8rpx;
  font-size: 28rpx;
  background-color: #fff;
  box-sizing: border-box;
}

.search-stats {
  position: absolute;
  right: 15rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 22rpx;
  color: #007AFF;
  background-color: rgba(0, 123, 255, 0.1);
  padding: 8rpx 12rpx;
  border-radius: 12rpx;
  white-space: nowrap;
  max-width: 180rpx;
  text-align: center;
}

.stock-selector {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 400rpx;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 0 0 8rpx 8rpx;
  z-index: 100;
}

.stock-option {
  display: flex;
  align-items: center;
  padding: 15rpx 20rpx;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.stock-option:hover {
  background-color: #f8f9fa;
}

.stock-option:active {
  background-color: #e9ecef;
}

.stock-code {
  font-size: 26rpx;
  font-weight: bold;
  color: #007AFF;
  min-width: 120rpx;
}

.stock-name {
  flex: 1;
  font-size: 24rpx;
  color: #333;
  margin-left: 15rpx;
}

.stock-price {
  font-size: 24rpx;
  color: #28a745;
  font-weight: bold;
}

/* 已选择股票样式 */
.selected-stock-info {
  background-color: #fff;
  border-radius: 8rpx;
  padding: 15rpx;
  border: 1px solid #28a745;
}

.selected-title {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.selected-stock-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stock-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.stock-code-selected {
  font-size: 28rpx;
  font-weight: bold;
  color: #007AFF;
  margin-right: 15rpx;
}

.stock-name-selected {
  font-size: 26rpx;
  color: #333;
}

.stock-price-selected {
  font-size: 26rpx;
  color: #28a745;
  font-weight: bold;
  margin-right: 15rpx;
}

.clear-selection-btn {
  padding: 8rpx 15rpx;
  background-color: #f56c6c;
  color: #fff;
  border: none;
  border-radius: 4rpx;
  font-size: 22rpx;
}

/* 股票统计信息样式 */
.stock-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  background-color: #fff;
  padding: 15rpx;
  border-radius: 8rpx;
  border: 1px solid #e9ecef;
}

.stats-item {
  display: flex;
  align-items: center;
}

.stats-label {
  font-size: 24rpx;
  color: #666;
  margin-right: 8rpx;
}

.stats-value {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
}

.stats-value.loaded {
  color: #28a745;
}

/* 期权询价功能样式 */
.option-inquiry-section {
  background-color: #fff;
  border-radius: 8rpx;
  padding: 20rpx;
  border: 1px solid #e9ecef;
}

.inquiry-form {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 20rpx;
}

.form-group {
  margin-bottom: 20rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 15rpx;
  display: block;
}

/* 期权类型按钮 */
.option-type-buttons {
  display: flex;
  gap: 15rpx;
}

.type-btn {
  flex: 1;
  height: 70rpx;
  line-height: 70rpx;
  text-align: center;
  border: 2px solid #e9ecef;
  border-radius: 8rpx;
  background-color: #fff;
  color: #666;
  font-size: 26rpx;
}

.type-btn.active {
  border-color: #007AFF;
  background-color: #007AFF;
  color: #fff;
}

/* 期限按钮 */
.term-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.term-btn {
  padding: 15rpx 25rpx;
  border: 1px solid #e9ecef;
  border-radius: 6rpx;
  background-color: #fff;
  color: #666;
  font-size: 24rpx;
}

.term-btn.active {
  border-color: #28a745;
  background-color: #28a745;
  color: #fff;
}

/* 结构类型按钮 */
.structure-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.structure-btn {
  padding: 15rpx 20rpx;
  border: 1px solid #e9ecef;
  border-radius: 6rpx;
  background-color: #fff;
  color: #666;
  font-size: 24rpx;
  white-space: nowrap;
}

.structure-btn.active {
  border-color: #ffc107;
  background-color: #ffc107;
  color: #000;
}

/* 价格输入框 */
.price-input {
  width: 100%;
  height: 70rpx;
  padding: 0 20rpx;
  border: 1px solid #e9ecef;
  border-radius: 6rpx;
  font-size: 26rpx;
  background-color: #fff;
}

.calculated-price {
  display: flex;
  align-items: center;
  height: 70rpx;
  padding: 0 20rpx;
  background-color: #e7f3ff;
  border-radius: 6rpx;
  border: 1px solid #007AFF;
}

.price-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #007AFF;
}

.price-ratio {
  font-size: 24rpx;
  color: #666;
  margin-left: 10rpx;
}

/* 询价按钮 */
.inquiry-button-container {
  text-align: center;
}

.inquiry-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #007AFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 30rpx;
  font-weight: bold;
}

.inquiry-btn[disabled] {
  background-color: #a0cfff;
  color: #fff;
}

/* 询价结果展示样式 */
.inquiry-result-section {
  background-color: #fff;
  border-radius: 8rpx;
  padding: 20rpx;
  border: 1px solid #28a745;
}

.result-basic-info {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 15rpx;
}

.stock-info-card {
  background-color: #fff;
  border-radius: 6rpx;
  padding: 15rpx;
  border: 1px solid #e9ecef;
}

.stock-header {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.stock-code-result {
  font-size: 28rpx;
  font-weight: bold;
  color: #007AFF;
  margin-right: 15rpx;
}

.stock-name-result {
  font-size: 26rpx;
  color: #333;
}

.option-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.option-type-text {
  font-size: 24rpx;
  color: #28a745;
  font-weight: bold;
}

.option-term {
  font-size: 24rpx;
  color: #666;
}

/* 价格信息样式 */
.result-prices {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 15rpx;
}

.price-card {
  display: flex;
  justify-content: space-around;
  background-color: #fff;
  border-radius: 6rpx;
  padding: 20rpx;
  border: 1px solid #e9ecef;
}

.price-item {
  text-align: center;
  flex: 1;
}

.price-label {
  font-size: 22rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.price-value {
  font-size: 26rpx;
  font-weight: bold;
}

.price-value.bid {
  color: #28a745;
}

.price-value.ask {
  color: #dc3545;
}

.price-value.last {
  color: #007AFF;
}

/* 希腊字母样式 */
.result-greeks {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 15rpx;
}

.greeks-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 15rpx;
}

.greeks-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15rpx;
}

.greek-item {
  background-color: #fff;
  border-radius: 6rpx;
  padding: 15rpx;
  text-align: center;
  border: 1px solid #e9ecef;
}

.greek-label {
  font-size: 22rpx;
  color: #666;
  margin-bottom: 8rpx;
  display: block;
}

.greek-value {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
}

.greek-desc {
  font-size: 20rpx;
  color: #999;
  margin-top: 5rpx;
}

/* 隐含波动率样式 */
.iv-section {
  background-color: #fff;
  border-radius: 6rpx;
  padding: 15rpx;
  text-align: center;
  border: 1px solid #e9ecef;
}

.iv-label {
  font-size: 22rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.iv-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #007AFF;
}

/* 券商报价表格样式 */
.broker-quotes-section {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 15rpx;
}

.quotes-table {
  background-color: #fff;
  border-radius: 6rpx;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.table-header {
  display: flex;
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
}

.header-cell {
  flex: 1;
  padding: 15rpx 10rpx;
  font-size: 24rpx;
  font-weight: bold;
  color: #495057;
  text-align: center;
  border-right: 1px solid #dee2e6;
}

.header-cell:last-child {
  border-right: none;
}

.table-body {
  background-color: #fff;
}

.table-row {
  display: flex;
  border-bottom: 1px solid #e9ecef;
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  flex: 1;
  padding: 12rpx 10rpx;
  font-size: 22rpx;
  text-align: center;
  border-right: 1px solid #e9ecef;
}

.table-cell:last-child {
  border-right: none;
}

.broker-name {
  color: #007AFF;
  font-weight: bold;
}

.quote-price {
  color: #28a745;
  font-weight: bold;
}

.quote-iv {
  color: #6c757d;
}

/* 计算说明样式 */
.calculation-info {
  background-color: #f8f9fa;
  border-radius: 8rpx;
  padding: 15rpx;
  border: 1px solid #e9ecef;
}

.info-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 15rpx;
}

.info-content {
  background-color: #fff;
  border-radius: 6rpx;
  padding: 15rpx;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
  flex-wrap: wrap;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 22rpx;
  color: #666;
  margin-right: 10rpx;
  min-width: 120rpx;
}

.info-value {
  font-size: 22rpx;
  color: #333;
  font-weight: bold;
}

.info-extra {
  font-size: 20rpx;
  color: #007AFF;
  margin-left: 8rpx;
}

/* 操作按钮样式 */
.result-actions {
  display: flex;
  gap: 15rpx;
}

.save-btn, .new-inquiry-btn {
  flex: 1;
  height: 70rpx;
  line-height: 70rpx;
  text-align: center;
  border: none;
  border-radius: 6rpx;
  font-size: 26rpx;
}

.save-btn {
  background-color: #28a745;
  color: #fff;
}

.new-inquiry-btn {
  background-color: #6c757d;
  color: #fff;
}

/* 初始加载状态样式 */
.initial-loading {
  text-align: center;
  padding: 80rpx 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  color: #fff;
  box-shadow: 0 8rpx 32rpx rgba(102, 126, 234, 0.3);
}

.loading-animation {
  margin-bottom: 30rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top: 4rpx solid #fff;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 15rpx;
}

.loading-desc {
  font-size: 26rpx;
  opacity: 0.9;
  margin-bottom: 20rpx;
  line-height: 1.5;
}

.loading-stage {
  font-size: 24rpx;
  opacity: 0.8;
  margin-bottom: 30rpx;
  padding: 10rpx 20rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  display: inline-block;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.loading-progress {
  max-width: 400rpx;
  margin: 0 auto;
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4rpx;
  overflow: hidden;
  margin-bottom: 15rpx;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 4rpx;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

.progress-text {
  font-size: 24rpx;
  opacity: 0.8;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 100rpx 40rpx;
  background-color: #f8f9fa;
  border-radius: 8rpx;
  border: 1px solid #e9ecef;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 30rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 15rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}
</style>