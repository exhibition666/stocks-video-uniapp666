<template>
  <s-layout title="Excel文件查看器" navbar="inner">
    <view class="excel-viewer-container">
      <!-- 操作按钮 -->
      <view class="action-buttons ss-p-20">
        <button class="load-btn" @click="loadExcelFiles" :disabled="loading">
          {{ loading ? '加载中...' : '加载Excel文件' }}
        </button>
        <button class="clear-btn" @click="clearData" v-if="hasData">
          清空数据
        </button>
      </view>

      <!-- 加载状态 -->
      <view class="loading-status ss-p-20" v-if="loading">
        <view class="status-item">
          <text>{{ loadingMessage }}</text>
        </view>
      </view>

      <!-- 文件列表 -->
      <view class="file-list ss-p-20" v-if="fileList.length > 0">
        <view class="section-title">找到的Excel文件 ({{ fileList.length }}个)</view>
        <view 
          v-for="(file, index) in fileList" 
          :key="index"
          class="file-item"
          @click="loadSingleFile(file)"
        >
          <view class="file-name">{{ file.name || file.path }}</view>
          <view class="file-path">{{ file.path || file.url }}</view>
          <view class="file-size" v-if="file.size">{{ formatFileSize(file.size) }}</view>
        </view>
      </view>

      <!-- Excel内容显示 -->
      <view class="excel-content" v-if="excelData.length > 0">
        <!-- 文件内容预览标题 -->
        <view class="content-preview-header ss-p-20">
          <text class="preview-title">文件内容预览</text>
        </view>

        <!-- 文件类型标签 -->
        <view class="file-type-tabs ss-p-x-20">
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

        <!-- 当前文件内容 -->
        <view class="current-file-content" v-if="excelData[activeFileIndex]">
          <!-- 工作表选择 -->
          <view class="sheet-selector ss-p-20">
            <text class="selector-label">选择工作表:</text>
            <view class="sheet-buttons">
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

          <!-- 表格内容 -->
          <view class="table-container" v-if="getCurrentSheetData()">
            <scroll-view scroll-x="true" class="table-scroll-container">
              <view class="excel-table">
                <!-- 表头 -->
                <view class="table-header" v-if="getTableHeaders().length > 0">
                  <view
                    v-for="(header, index) in getTableHeaders()"
                    :key="index"
                    class="header-cell"
                    :style="{ minWidth: getColumnWidth(header) }"
                  >
                    {{ header }}
                  </view>
                </view>

                <!-- 数据行 -->
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

            <!-- 数据统计信息 -->
            <view class="table-footer ss-p-20">
              <text class="footer-text">
                注: 仅显示前 {{ Math.min(100, getCurrentSheetData().length) }} 条数据
                <text v-if="getCurrentSheetData().length > 100">，总共{{ getCurrentSheetData().length }}条</text>
              </text>
            </view>
          </view>

          <!-- 空数据提示 -->
          <view class="empty-sheet" v-else>
            <s-empty text="当前工作表暂无数据"></s-empty>
          </view>
        </view>
      </view>

      <!-- 错误信息 -->
      <view class="error-info ss-p-20" v-if="errorList.length > 0">
        <view class="section-title error-title">错误信息</view>
        <view 
          v-for="(error, index) in errorList"
          :key="index"
          class="error-item"
        >
          <text>{{ error }}</text>
        </view>
      </view>

      <!-- 空状态 -->
      <s-empty v-if="!loading && !hasData && errorList.length === 0" text="暂无数据，点击加载Excel文件"></s-empty>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import sheep from '@/sheep';
import * as XLSX from 'xlsx';

// 响应式数据
const loading = ref(false);
const loadingMessage = ref('');
const fileList = ref([]);
const excelData = ref([]);
const errorList = ref([]);
const activeFileIndex = ref(0);

// 计算属性
const hasData = computed(() => {
  return fileList.value.length > 0 || excelData.value.length > 0;
});

// 格式化文件大小
const formatFileSize = (size) => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
};

// 加载Excel文件
const loadExcelFiles = async () => {
  loading.value = true;
  loadingMessage.value = '正在获取文件列表...';
  errorList.value = [];
  fileList.value = [];
  excelData.value = [];

  try {
    // 1. 获取文件列表
    const fileListResponse = await sheep.$request({
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

    console.log('文件列表响应:', fileListResponse);

    if (fileListResponse.code !== 0) {
      throw new Error('获取文件列表失败: ' + fileListResponse.msg);
    }

    const allFiles = fileListResponse.data.list || [];
    
    // 筛选Excel文件
    const excelFiles = allFiles.filter(file => {
      const filePath = file.path || file.url || '';
      return filePath.toLowerCase().endsWith('.xlsx') || filePath.toLowerCase().endsWith('.xls');
    });

    fileList.value = excelFiles;
    loadingMessage.value = `找到${excelFiles.length}个Excel文件，开始加载...`;

    // 2. 加载每个Excel文件
    for (let i = 0; i < excelFiles.length; i++) {
      const file = excelFiles[i];
      loadingMessage.value = `正在加载文件 ${i + 1}/${excelFiles.length}: ${file.name || file.path}`;
      
      try {
        await loadSingleFile(file, false);
      } catch (error) {
        console.error(`加载文件失败: ${file.name || file.path}`, error);
        errorList.value.push(`文件 ${file.name || file.path}: ${error.message}`);
      }
    }

    loadingMessage.value = '加载完成';
    
    if (excelData.value.length === 0) {
      errorList.value.push('没有成功加载任何Excel文件');
    }

  } catch (error) {
    console.error('加载Excel文件失败:', error);
    errorList.value.push('加载失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 加载单个文件
const loadSingleFile = async (file, showLoading = true) => {
  if (showLoading) {
    loading.value = true;
    loadingMessage.value = `正在加载: ${file.name || file.path}`;
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

    // 解析Excel
    const uint8Array = new Uint8Array(response.data);
    const workbook = XLSX.read(uint8Array, { type: 'array' });
    
    console.log('Excel工作簿:', workbook);
    console.log('工作表名称:', workbook.SheetNames);

    const fileData = {
      fileName: file.name || filePath.split('/').pop(),
      filePath: filePath,
      activeSheet: 0,
      sheets: []
    };

    // 解析每个工作表
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log(`工作表 ${sheetName} 原始数据:`, jsonData.slice(0, 5));

      // 转换为对象数组
      if (jsonData.length > 0) {
        const headers = jsonData[0];
        const rows = jsonData.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, colIndex) => {
            obj[header || `列${colIndex + 1}`] = row[colIndex] || '';
          });
          return obj;
        });

        fileData.sheets.push({
          name: sheetName,
          data: rows,
          rawData: jsonData
        });
      }
    });

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

// 获取文件类型标签
const getFileTypeLabel = (fileName) => {
  if (fileName.includes('股指') || fileName.includes('index')) {
    return '股指报价表';
  } else if (fileName.includes('期权') || fileName.includes('option')) {
    return '期权报价表';
  }
  return fileName.replace(/\.(xlsx|xls)$/i, '');
};

// 获取当前工作表数据
const getCurrentSheetData = () => {
  if (!excelData.value[activeFileIndex.value]) return null;
  const currentFile = excelData.value[activeFileIndex.value];
  const currentSheet = currentFile.sheets[currentFile.activeSheet];
  return currentSheet ? currentSheet.data : null;
};

// 获取表格表头
const getTableHeaders = () => {
  const data = getCurrentSheetData();
  if (!data || data.length === 0) return [];
  return Object.keys(data[0]);
};

// 获取列宽度
const getColumnWidth = (header) => {
  // 根据表头内容设置不同的列宽
  const headerLengthMap = {
    '代码': '120rpx',
    '标的': '150rpx',
    '结构': '100rpx',
    '方向': '100rpx',
    '1M': '120rpx',
    '3M': '120rpx',
    '6M': '120rpx',
    '12M': '120rpx',
    '客户买开': '120rpx',
    '客户卖开': '120rpx',
    '看涨': '100rpx',
    '看跌': '100rpx'
  };

  return headerLengthMap[header] || '150rpx';
};

// 格式化单元格值
const formatCellValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '/';
  }

  // 如果是数字且小数位数较多，保留合适的小数位
  if (typeof value === 'number') {
    if (value < 1 && value > 0) {
      return value.toFixed(6); // 小数保留6位
    } else if (value < 100) {
      return value.toFixed(4); // 保留4位小数
    } else {
      return value.toFixed(2); // 保留2位小数
    }
  }

  // 如果是字符串数字，尝试格式化
  if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
    const num = parseFloat(value);
    if (num < 1 && num > 0) {
      return num.toFixed(6);
    } else if (num < 100) {
      return num.toFixed(4);
    } else {
      return num.toFixed(2);
    }
  }

  return String(value);
};

// 清空数据
const clearData = () => {
  fileList.value = [];
  excelData.value = [];
  errorList.value = [];
  activeFileIndex.value = 0;
};

// 页面加载时自动加载Excel文件
onMounted(() => {
  console.log('Excel查看器页面已加载，开始自动加载Excel文件');
  loadExcelFiles();
});
</script>

<style lang="scss" scoped>
.excel-viewer-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.action-buttons {
  background-color: #fff;
  display: flex;
  gap: 20rpx;
  border-bottom: 1px solid #f0f0f0;
}

.load-btn, .clear-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
}

.load-btn {
  background-color: #007AFF;
  color: #fff;
}

.load-btn[disabled] {
  background-color: #a0cfff;
}

.clear-btn {
  background-color: #f56c6c;
  color: #fff;
}

.loading-status {
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
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

.error-title {
  color: #f56c6c;
}

.file-list {
  background-color: #fff;
  margin-bottom: 20rpx;
}

.file-item {
  padding: 20rpx;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
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
}

.file-size {
  font-size: 24rpx;
  color: #999;
}

/* 文件内容预览样式 */
.content-preview-header {
  background-color: #fff;
  border-bottom: 1px solid #e9ecef;
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
  margin: 0 20rpx;
  border-radius: 8rpx;
  overflow: hidden;
  border: 1px solid #e9ecef;
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

.error-info {
  background-color: #fff;
  margin-bottom: 20rpx;
}

.error-item {
  padding: 20rpx;
  background-color: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  color: #f56c6c;
}
</style>
