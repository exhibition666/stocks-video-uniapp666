<!-- 个人中心：支持装修 -->
<template>
  <s-layout
    title="我的"
    tabbar="/pages/index/user"
    navbar="custom"
    :bgStyle="template.page"
    :navbarStyle="template.navigationBar"
    onShareAppMessage
    :refreshOnShow="true"
  >
    <!-- 调试信息（隐藏） -->
    <!-- <view class="debug-info" v-if="showDebug">
      <view class="debug-title">调试信息</view>
      <view class="debug-item">登录状态: {{ isLogin ? '已登录' : '未登录' }}</view>
      <view class="debug-item">Token: {{ token ? token.substring(0, 15) + '...' : '无' }}</view>
      <view class="debug-item">用户信息: {{ JSON.stringify(userInfo).substring(0, 50) + '...' }}</view>
      <view class="debug-item">API调用状态: {{ apiCallStatus }}</view>
      <button class="debug-btn" @tap="reloadUserData">重新加载用户数据</button>
      <button class="debug-btn" @tap="showFullUserInfo">查看完整用户数据</button>
      <button class="debug-btn" @tap="showDebug = false">关闭调试</button>
    </view> -->

    <!-- 完整用户数据弹窗（隐藏） -->
    <!-- <su-popup :show="showUserInfoModal" round="10" @close="showUserInfoModal = false">
      <view class="user-info-modal">
        <view class="user-info-modal-title">用户数据结构</view>
        <scroll-view scroll-y class="user-info-modal-content">
          <text class="user-info-json">{{ JSON.stringify(userInfo, null, 2) }}</text>
        </scroll-view>
        <button class="user-info-modal-close" @tap="showUserInfoModal = false">关闭</button>
      </view>
    </su-popup> -->

    <!-- 加载中状态 -->
    <view v-if="loading" class="loading-container ss-flex ss-flex-col ss-col-center ss-row-center">
      <view class="loading-icon"></view>
      <view class="loading-text ss-m-t-20">加载中...</view>
    </view>

    <!-- 未登录状态显示登录按钮 -->
    <view v-else-if="!isLogin" class="not-login-container ss-flex ss-flex-col ss-col-center ss-row-center">
      <view class="not-login-content ss-flex ss-flex-col ss-col-center ss-row-center">
        <image class="avatar-placeholder" src="/static/default-avatar.png" mode="aspectFill"></image>
        <view class="login-tips ss-m-t-30">登录后查看您的个人信息</view>
        <button class="login-btn ss-m-t-40" @tap="showLogin">立即登录/注册</button>
        <!-- 隐藏调试按钮 -->
        <!-- <button class="debug-toggle-btn ss-m-t-20" @tap="showDebug = !showDebug">{{ showDebug ? '关闭' : '显示' }}调试信息</button> -->
      </view>
    </view>

    <!-- 已登录状态显示个人中心内容 -->
    <template v-else>
      <!-- 加载出错时显示重试按钮 -->
      <view v-if="loadError" class="error-container ss-flex ss-flex-col ss-col-center ss-row-center">
        <image class="error-icon" src="/static/error.png" mode="aspectFit"></image>
        <view class="error-tips ss-m-t-20">加载失败，请重试</view>
        <button class="retry-btn ss-m-t-30" @tap="loadUserData">重新加载</button>
        <!-- 隐藏调试按钮 -->
        <!-- <button class="debug-toggle-btn ss-m-t-20" @tap="showDebug = !showDebug">{{ showDebug ? '关闭' : '显示' }}调试信息</button> -->
      </view>

      <!-- 正常显示个人中心内容 -->
      <template v-else-if="template && template.components && template.components.length">
    <s-block
      v-for="(item, index) in template.components"
      :key="index"
      :styles="item.property.style"
    >
      <s-block-item :type="item.id" :data="item.property" :styles="item.property.style" />
    </s-block>
        
        <!-- 退出登录按钮 -->
        <view class="logout-container">
          <button class="logout-btn" @tap="showLogoutConfirm">退出登录</button>
          <!-- 隐藏调试按钮 -->
          <!-- <button class="debug-toggle-btn ss-m-t-20" @tap="showDebug = !showDebug">{{ showDebug ? '关闭' : '显示' }}调试信息</button> -->
        </view>
      </template>
      
      <!-- 没有模板数据时显示默认内容 -->
      <view v-else class="default-container ss-flex ss-flex-col ss-col-center ss-row-center">
        <!-- 移除头像显示 -->
        <!-- <image class="avatar" :src="userInfo.avatar || '/static/default-avatar.png'" mode="aspectFill"></image> -->
        <view class="nickname ss-m-t-20">{{ userInfo.nickname || '用户' }}</view>

        <!-- 移除用户等级信息显示 -->
        <!-- <view class="user-level ss-m-t-10">
          <view class="level-tag" :style="{ backgroundColor: getLevelColor(userInfo.level) }">
            <text class="level-icon">{{ getLevelIcon(userInfo.level) }}</text>
            {{ userInfo.levelName || formatLevel(userInfo.level) }}
          </view>
          <view class="vip-expire" v-if="isVipExpired">
            <text>会员已过期</text>
          </view>
        </view> -->
        
        <!-- 用户详细信息 -->
        <view class="user-info-card ss-m-t-30">
          <view class="info-item">
            <view class="info-label">会员等级</view>
            <view class="info-value level-value" :style="{ color: getLevelColor(userInfo.level) }">
              {{ userInfo.levelName || formatLevel(userInfo.level) }}
            </view>
          </view>
          <view class="info-item" v-if="!isVipExpired && userInfo.vipExpireTime">
            <view class="info-label">会员到期</view>
            <view class="info-value">{{ formatDate(userInfo.vipExpireTime) }}</view>
          </view>
          <!-- 隐藏会员积分 -->
          <!-- <view class="info-item">
            <view class="info-label">会员积分</view>
            <view class="info-value">{{ userInfo.point || 0 }}</view>
          </view> -->
          <!-- 隐藏注册时间 -->
          <!-- <view class="info-item">
            <view class="info-label">注册时间</view>
            <view class="info-value">{{ formatDate(userInfo.createTime) }}</view>
          </view> -->
          <view class="info-item" v-if="userInfo.mobile">
            <view class="info-label">手机号码</view>
            <view class="info-value">{{ formatMobile(userInfo.mobile) }}</view>
          </view>
        </view>

        <!-- 隐藏余额 -->
        <!-- <view class="wallet ss-m-t-30">
          <view class="balance">余额: {{ userWallet.balance || 0 }}</view>
        </view> -->
        
        <!-- 退出登录按钮 -->
        <button class="logout-btn ss-m-t-60" @tap="showLogoutConfirm">退出登录</button>
        <!-- 隐藏调试按钮 -->
        <!-- <button class="debug-toggle-btn ss-m-t-20" @tap="showDebug = !showDebug">{{ showDebug ? '关闭' : '显示' }}调试信息</button> -->
      </view>
      
      <!-- 退出登录确认弹窗 -->
      <su-popup :show="showLogoutModal" round="10" @close="showLogoutModal = false">
        <view class="logout-modal">
          <view class="logout-modal-title">确认退出</view>
          <view class="logout-modal-content">是否确认退出当前账号？</view>
          <view class="logout-modal-btns">
            <button class="logout-modal-cancel" @tap="showLogoutModal = false">取消</button>
            <button class="logout-modal-confirm" @tap="handleLogout">确认退出</button>
          </view>
        </view>
      </su-popup>
    </template>
  </s-layout>
</template>

<script>
  import sheep from '@/sheep';
  import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
  import { computed, reactive, ref } from 'vue';
  import { showAuthModal } from '@/sheep/hooks/useModal';
  import DiyApi from '@/sheep/api/promotion/diy';

  export default {
    data() {
      return {
        template: {},
        loadError: false,
        loading: true,
        userInfo: {},
        userWallet: {},
        showLogoutModal: false,
        showDebug: false,
        apiCallStatus: '未调用',
        token: '',
        showUserInfoModal: false, // 新增：用于控制完整用户数据弹窗的显示
        loginSuccessListener: null // 登录成功事件监听器
      };
    },
    computed: {
      isLogin() {
        // 检查token是否存在，确保登录状态判断准确
        const token = uni.getStorageSync('token');
        this.token = token || '';
        
        // 添加调试日志
        console.log('检查登录状态:', !!token, sheep.$store('user').isLogin);
        
        // 确保store中的登录状态与token一致
        if (!!token !== sheep.$store('user').isLogin) {
          console.log('登录状态不一致，重新设置store中的登录状态');
          sheep.$store('user').checkLoginStatus();
        }
        
        return !!token && sheep.$store('user').isLogin;
      },
      isVipExpired() {
        if (!this.userInfo || !this.userInfo.vipExpireTime) {
          return true; // 没有过期时间视为已过期
        }
        const now = new Date().getTime();
        const vipExpireTime = parseInt(this.userInfo.vipExpireTime);
        return vipExpireTime <= now;
      }
    },
    async onLoad() {
      // 立即显示加载状态
      this.loading = true;
      
      try {
        // 检查登录状态
        this.checkLoginStatus();
        
        // 加载个人中心模板
        await this.loadTemplate();
        
        // 加载用户数据
        if (this.isLogin) {
          await this.loadUserData();
        }
        
        // 监听登录成功事件
        this.loginSuccessListener = () => {
          console.log('监听到登录成功事件，重新加载用户数据');
          // 重新加载用户数据
          this.loading = true;
          this.loadError = false;
          
          // 重新检查登录状态
          this.checkLoginStatus();
          
          // 延迟执行，确保token已经设置完成
          setTimeout(() => {
            console.log('登录成功事件处理：强制重新获取用户信息');
            
            // 强制重新获取用户信息
            sheep.$store('user').updateUserData(true).then((userInfo) => {
              console.log('登录成功事件处理：用户数据更新成功');
              
              // 更新本地数据
              this.userInfo = sheep.$store('user').userInfo;
              this.userWallet = sheep.$store('user').userWallet;
              
              // 处理用户等级信息
              this.processUserLevel();
              
              // 重新加载模板
              this.loadTemplate().finally(() => {
                this.loading = false;
                
                // 确保底部导航栏显示
                uni.$emit('updateTabbar');
              });
            }).catch(error => {
              console.error('登录成功事件处理：加载用户数据失败:', error);
              this.loadError = true;
              this.loading = false;
            });
          }, 300);
        };
        
        uni.$on('userLogin:success', this.loginSuccessListener);
      } catch (error) {
        console.error('初始化失败:', error);
        this.loadError = true;
        this.apiCallStatus = '初始化失败: ' + (error.message || JSON.stringify(error));
      } finally {
        this.loading = false;
      }
    },
    onUnload() {
      // 页面卸载时移除事件监听
      if (this.loginSuccessListener) {
        uni.$off('userLogin:success', this.loginSuccessListener);
      }
    },
    onShow() {
      console.log('用户页面显示，检查登录状态');
      
      // 每次显示页面时都检查登录状态
      this.checkLoginStatus();
      
      // 设置加载状态
      this.loading = true;
      
      // 每次显示页面时都重新加载数据
      if (this.isLogin) {
        console.log('用户已登录，开始加载用户数据');
        
        // 延迟执行，确保token已经设置完成
        setTimeout(() => {
          // 如果已登录，先获取最新的用户数据
          sheep.$store('user').updateUserData(true).then((userInfo) => {
            console.log('用户数据加载成功:', JSON.stringify(userInfo).substring(0, 100) + '...');
            
            // 更新本地数据
            this.userInfo = sheep.$store('user').userInfo;
            this.userWallet = sheep.$store('user').userWallet;
            
            // 处理用户等级信息
            this.processUserLevel();
            
            // 加载模板
            this.loadTemplate().finally(() => {
              this.loading = false;
              
              // 确保底部导航栏显示
              uni.$emit('updateTabbar');
            });
          }).catch(error => {
            console.error('加载用户数据失败:', error);
            this.loadError = true;
            this.loading = false;
            
            // 如果API返回401或其他未授权错误，可能是token过期，重置用户状态
            if (error.statusCode === 401 || (error.message && error.message.includes('unauthorized'))) {
              sheep.$store('user').resetUserData();
            }
            
            // 加载模板
            this.loadTemplate();
          });
        }, 300);
      } else {
        console.log('用户未登录，只加载模板');
        
        // 未登录时只加载模板
        this.loadTemplate().finally(() => {
          this.loading = false;
        });
      }
    },
    onPullDownRefresh() {
      console.log('用户页面下拉刷新');
      
      // 检查登录状态
      this.checkLoginStatus();
      
      // 如果已登录，强制更新用户数据
      if (this.isLogin) {
        console.log('用户已登录，强制更新用户数据');
        
        // 强制更新用户数据
        sheep.$store('user').updateUserData(true).then((userInfo) => {
          console.log('下拉刷新：用户数据更新成功');
          
          // 更新本地数据
          this.userInfo = sheep.$store('user').userInfo;
          this.userWallet = sheep.$store('user').userWallet;
          
          // 处理用户等级信息
          this.processUserLevel();
          
          // 加载模板
          this.loadTemplate().finally(() => {
            uni.stopPullDownRefresh();
            
            // 确保底部导航栏显示
            uni.$emit('updateTabbar');
          });
        }).catch(error => {
          console.error('下拉刷新：用户数据更新失败', error);
          uni.stopPullDownRefresh();
        });
      } else {
        // 未登录时只加载模板
        this.loadTemplate().finally(() => {
      uni.stopPullDownRefresh();
        });
      }
    },
    methods: {
      // 检查登录状态
      checkLoginStatus() {
        const token = uni.getStorageSync('token');
        this.token = token || '';
        if (!token) {
          // 如果没有token，确保用户状态为未登录
          sheep.$store('user').resetUserData();
        }
      },
      
      // 显示登录弹窗
      showLogin() {
        showAuthModal('smsLogin');
      },
      
      // 显示退出登录确认弹窗
      showLogoutConfirm() {
        this.showLogoutModal = true;
      },
      
      // 处理退出登录
      async handleLogout() {
        this.showLogoutModal = false;
        
        try {
          await sheep.$store('user').logout();
          uni.showToast({
            title: '退出登录成功',
            icon: 'success',
            duration: 2000
          });
          
          // 重新加载页面数据
          this.checkLoginStatus();
        } catch (error) {
          console.error('退出登录失败:', error);
          uni.showToast({
            title: '退出登录失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      },
      
      // 重新加载用户数据（调试用）
      async reloadUserData() {
        try {
          this.apiCallStatus = '正在重新加载用户数据...';
          await sheep.$store('user').updateUserData();
          this.userInfo = sheep.$store('user').userInfo;
          this.userWallet = sheep.$store('user').userWallet;
          this.apiCallStatus = '重新加载成功: ' + new Date().toLocaleTimeString();
        } catch (error) {
          console.error('重新加载失败:', error);
          this.apiCallStatus = '重新加载失败: ' + (error.message || JSON.stringify(error));
        }
      },
      
      // 加载模板数据
      async loadTemplate() {
        try {
          this.apiCallStatus = '正在加载模板数据...';
          // 先从store中获取模板
          let appTemplate = sheep.$store('app').template;
          
          // 如果store中没有模板数据，尝试从API获取
          if (!appTemplate.user || !appTemplate.user.components || appTemplate.user.components.length === 0) {
            const { data } = await DiyApi.getUsedDiyTemplate();
            if (data && data.user) {
              this.template = data.user;
              
              // 确保导航栏样式存在
              if (!this.template.navigationBar) {
                this.template.navigationBar = { background: '#ffffff' };
              }
              
              // 更新store中的模板数据
              sheep.$store('app').template.user = data.user;
              this.apiCallStatus = '模板加载成功: ' + new Date().toLocaleTimeString();
            } else {
              // 创建默认模板
              this.template = {
                page: { background: '#f5f5f5' },
                navigationBar: { background: '#ffffff' },
                components: []
              };
              this.apiCallStatus = '使用默认模板: ' + new Date().toLocaleTimeString();
            }
          } else {
            this.template = appTemplate.user;
            
            // 确保导航栏样式存在
            if (!this.template.navigationBar) {
              this.template.navigationBar = { background: '#ffffff' };
            }
            
            this.apiCallStatus = '使用缓存模板: ' + new Date().toLocaleTimeString();
          }
          
          // 强制更新导航栏
          setTimeout(() => {
            uni.$emit('updateNavBar');
          }, 100);
        } catch (error) {
          console.error('加载模板失败:', error);
          this.apiCallStatus = '模板加载失败: ' + (error.message || JSON.stringify(error));
          // 创建默认模板
          this.template = {
            page: { background: '#f5f5f5' },
            navigationBar: { background: '#ffffff' },
            components: []
          };
        }
      },
      
      // 加载用户数据
      async loadUserData() {
        // 先检查登录状态
        if (!this.isLogin) {
          console.log('用户未登录，无法加载用户数据');
          return;
        }
        
        this.loadError = false;
        this.apiCallStatus = '正在加载用户数据...';
        
        try {
          console.log('开始加载用户数据，token:', this.token.substring(0, 15) + '...');
          
          // 强制更新用户数据
          await sheep.$store('user').updateUserData(true);
          
          // 获取用户基本信息
          this.userInfo = sheep.$store('user').userInfo;
          
          // 检查用户数据是否有效
          if (!this.userInfo || !this.userInfo.nickname) {
            console.error('用户数据无效:', this.userInfo);
            
            // 尝试重新获取用户信息
            const userInfo = await sheep.$store('user').getInfo();
            if (userInfo) {
              this.userInfo = userInfo;
              console.log('重新获取用户信息成功');
            } else {
              throw new Error('获取用户信息失败');
            }
          }
          
          // 处理用户等级信息
          this.processUserLevel();
          
          // 获取钱包信息
          this.userWallet = sheep.$store('user').userWallet;
          
          this.apiCallStatus = '用户数据加载成功: ' + new Date().toLocaleTimeString();
          
          // 打印用户数据用于调试
          console.log('用户数据加载成功:', JSON.stringify(this.userInfo).substring(0, 100) + '...');
        } catch (error) {
          console.error('加载用户数据失败:', error);
          this.loadError = true;
          this.apiCallStatus = '用户数据加载失败: ' + (error.message || JSON.stringify(error));
          
          // 如果API返回401或其他未授权错误，可能是token过期，重置用户状态
          if (error.statusCode === 401 || error.message?.includes('unauthorized')) {
            sheep.$store('user').resetUserData();
          }
        }
      },
      
      // 处理用户等级信息
      processUserLevel() {
        // 首先检查会员是否过期
        const now = new Date().getTime();
        const vipExpireTime = this.userInfo.vipExpireTime ? parseInt(this.userInfo.vipExpireTime) : 0;
        
        // 如果vipExpireTime存在且未过期，则使用level中的信息
        if (vipExpireTime && vipExpireTime > now) {
          // 会员未过期，使用level中的name作为等级名称
          if (this.userInfo.level && this.userInfo.level.name) {
            this.userInfo.levelName = this.userInfo.level.name;
            this.userInfo.levelId = this.userInfo.level.id;
            this.userInfo.levelIcon = this.userInfo.level.icon || '';
          }
        } else {
          // 会员已过期或没有会员，显示为普通用户
          this.userInfo.levelName = '普通用户';
          this.userInfo.levelId = 0;
          this.userInfo.levelIcon = '';
        }
      },
      
      // 格式化用户等级
      formatLevel(level) {
        // 如果直接传入的是level对象
        if (typeof level === 'object' && level !== null) {
          return level.name || '普通用户';
        }
        
        // 如果会员已过期，直接返回普通用户
        const now = new Date().getTime();
        const vipExpireTime = this.userInfo.vipExpireTime ? parseInt(this.userInfo.vipExpireTime) : 0;
        if (!vipExpireTime || vipExpireTime <= now) {
          return '普通用户';
        }
        
        // 根据level值返回对应的等级名称
        if (typeof level === 'number' || typeof level === 'string') {
          const levelId = parseInt(level);
          const levelMap = {
            0: '普通用户',
            1: '青铜会员',
            2: '白银会员',
            3: '黄金会员',
            4: '铂金会员',
            5: '钻石会员',
            6: 'VIP会员'
          };
          
          return levelMap[levelId] || `${levelId}级会员`;
        }
        
        return '普通用户';
      },
      
      // 获取等级对应的颜色
      getLevelColor(level) {
        // 如果会员已过期，使用普通用户颜色
        const now = new Date().getTime();
        const vipExpireTime = this.userInfo.vipExpireTime ? parseInt(this.userInfo.vipExpireTime) : 0;
        if (!vipExpireTime || vipExpireTime <= now) {
          return '#999999'; // 普通用户颜色
        }
        
        // 如果传入的是对象
        if (typeof level === 'object' && level !== null) {
          level = level.id;
        }
        
        // 转换为数字
        const levelId = parseInt(level) || 0;
        
        // 根据level值返回对应的颜色
        const colorMap = {
          0: '#999999', // 普通用户
          1: '#cd7f32', // 青铜
          2: '#c0c0c0', // 白银
          3: '#ffd700', // 黄金
          4: '#e5e4e2', // 铂金
          5: '#b9f2ff', // 钻石
          6: '#ff5000'  // VIP
        };
        
        return colorMap[levelId] || '#ff5000';
      },
      
      // 获取等级对应的图标
      getLevelIcon(level) {
        // 如果会员已过期，使用普通用户图标
        const now = new Date().getTime();
        const vipExpireTime = this.userInfo.vipExpireTime ? parseInt(this.userInfo.vipExpireTime) : 0;
        if (!vipExpireTime || vipExpireTime <= now) {
          return '○'; // 普通用户图标
        }
        
        // 如果传入的是对象
        if (typeof level === 'object' && level !== null) {
          level = level.id;
        }
        
        // 转换为数字
        const levelId = parseInt(level) || 0;

        const iconMap = {
          0: '○', // 普通用户
          1: '★', // 青铜
          2: '★★', // 白银
          3: '★★★', // 黄金
          4: '★★★★', // 铂金
          5: '★★★★★', // 钻石
          6: '✦'  // VIP
        };

        return iconMap[levelId] || '○'; // 默认图标
      },
      
      // 格式化日期
      formatDate(timestamp) {
        if (!timestamp) return '未知';
        
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      },
      
      // 格式化手机号码
      formatMobile(mobile) {
        if (!mobile) return '';
        
        // 隐藏中间4位数字
        return mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      },

      // 显示完整用户数据
      showFullUserInfo() {
        this.showUserInfoModal = true;
      }
    },
  };
</script>

<style lang="scss" scoped>
  .debug-info {
    padding: 20rpx;
    background-color: rgba(0, 0, 0, 0.8);
    color: #fff;
    font-size: 24rpx;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    max-height: 60vh;
    overflow-y: auto;
    
    .debug-title {
      font-size: 28rpx;
      font-weight: bold;
      margin-bottom: 10rpx;
      text-align: center;
    }
    
    .debug-item {
      margin-bottom: 10rpx;
      word-break: break-all;
    }
    
    .debug-btn {
      margin-top: 10rpx;
      font-size: 24rpx;
      height: 60rpx;
      line-height: 60rpx;
      background-color: #666;
      color: #fff;
    }
  }
  
  .debug-toggle-btn {
    background-color: #f0f0f0;
    color: #666;
    font-size: 24rpx;
    height: 60rpx;
    line-height: 60rpx;
    border-radius: 30rpx;
    width: 200rpx;
  }

  .loading-container {
    padding: 40rpx;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

    .loading-icon {
      width: 100rpx;
      height: 100rpx;
      border: 6rpx solid rgba(255, 255, 255, 0.3);
      border-top: 6rpx solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.3);
    }

    .loading-text {
      font-size: 30rpx;
      color: #7f8c8d;
      font-weight: 400;
      letter-spacing: 1rpx;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  }
  
  .not-login-container {
    padding: 40rpx;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
    overflow: hidden;
  }

  .not-login-container::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(180deg); }
  }

  .avatar-placeholder {
    width: 180rpx;
    height: 180rpx;
    border-radius: 50%;
    border: 4rpx solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 2;
  }

  .login-tips {
    font-size: 32rpx;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    font-weight: 300;
    letter-spacing: 1rpx;
    position: relative;
    z-index: 2;
  }

  .login-btn {
    width: 320rpx;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 44rpx;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    color: #fff;
    font-size: 32rpx;
    font-weight: 500;
    box-shadow: 0 8rpx 24rpx rgba(238, 90, 36, 0.4);
    border: none;
    position: relative;
    z-index: 2;
    transition: all 0.3s ease;
  }

  .login-btn:active {
    transform: translateY(2rpx);
    box-shadow: 0 4rpx 12rpx rgba(238, 90, 36, 0.4);
  }
  
  .error-container {
    padding: 40rpx;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

    .error-icon {
      width: 180rpx;
      height: 180rpx;
      opacity: 0.8;
    }

    .error-tips {
      font-size: 32rpx;
      color: #7f8c8d;
      font-weight: 400;
      letter-spacing: 1rpx;
    }

    .retry-btn {
      width: 320rpx;
      height: 88rpx;
      line-height: 88rpx;
      border-radius: 44rpx;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      font-size: 30rpx;
      font-weight: 500;
      box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.4);
      border: none;
      transition: all 0.3s ease;
    }

    .retry-btn:active {
      transform: translateY(2rpx);
      box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.4);
    }
  }
  
  .default-container {
    padding: 40rpx;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    position: relative;

    /* 移除头像样式 */
    /* .avatar {
      width: 180rpx;
      height: 180rpx;
      border-radius: 50%;
      border: 6rpx solid #fff;
      box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15);
      position: relative;
      z-index: 2;
    } */

    .nickname {
      font-size: 40rpx;
      font-weight: 700;
      color: #2c3e50;
      margin-top: 60rpx;
      letter-spacing: 2rpx;
      text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
    }

    /* 移除用户等级样式 */
    /* .user-level {
      margin-top: 15rpx;
      display: flex;
      flex-direction: column;
      align-items: center;

      .level-tag {
        display: flex;
        align-items: center;
        padding: 8rpx 24rpx;
        border-radius: 25rpx;
        font-size: 26rpx;
        color: #fff;
        font-weight: 500;
        box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10rpx);
      }

      .level-icon {
        margin-right: 8rpx;
        font-size: 30rpx;
      }

      .vip-expire {
        margin-top: 12rpx;
        font-size: 24rpx;
        color: #e74c3c;
        text-align: center;
        padding: 6rpx 16rpx;
        background: rgba(231, 76, 60, 0.1);
        border-radius: 15rpx;
        border: 1rpx solid rgba(231, 76, 60, 0.2);
      }
    } */
    
    .user-info-card {
      width: 90%;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20rpx);
      border-radius: 20rpx;
      padding: 30rpx;
      margin-top: 40rpx;
      box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
      border: 1rpx solid rgba(255, 255, 255, 0.3);

      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20rpx 0;
        border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

        &:last-child {
          border-bottom: none;
        }

        .info-label {
          color: #7f8c8d;
          font-size: 28rpx;
          font-weight: 400;
        }

        .info-value {
          color: #2c3e50;
          font-size: 30rpx;
          font-weight: 600;

          &.level-value {
            font-weight: 700;
            text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
          }
        }
      }
    }
    
    .wallet {
      margin-top: 30rpx;
      background-color: #fff;
      padding: 30rpx;
      border-radius: 12rpx;
      width: 80%;
      text-align: center;
      box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
      
      .balance {
        font-size: 30rpx;
        color: #ff5000;
      }
    }
  }
  
  .logout-container {
    padding: 40rpx;
    margin-top: 50rpx;
    margin-bottom: 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .logout-btn {
    width: 90%;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 44rpx;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
    backdrop-filter: blur(20rpx);
    color: #e74c3c;
    font-size: 30rpx;
    font-weight: 500;
    border: 2rpx solid rgba(231, 76, 60, 0.3);
    box-shadow: 0 4rpx 20rpx rgba(231, 76, 60, 0.2);
    transition: all 0.3s ease;
  }

  .logout-btn:active {
    transform: translateY(2rpx);
    box-shadow: 0 2rpx 10rpx rgba(231, 76, 60, 0.2);
  }
  
  .logout-modal {
    padding: 50rpx;
    background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
    border-radius: 20rpx;

    .logout-modal-title {
      font-size: 38rpx;
      font-weight: 600;
      text-align: center;
      margin-bottom: 30rpx;
      color: #2c3e50;
      letter-spacing: 1rpx;
    }

    .logout-modal-content {
      font-size: 30rpx;
      color: #7f8c8d;
      text-align: center;
      margin-bottom: 50rpx;
      line-height: 1.5;
    }

    .logout-modal-btns {
      display: flex;
      justify-content: space-between;
      gap: 20rpx;

      button {
        width: 45%;
        height: 88rpx;
        line-height: 88rpx;
        border-radius: 44rpx;
        font-size: 30rpx;
        font-weight: 500;
        border: none;
        transition: all 0.3s ease;
      }

      .logout-modal-cancel {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        color: #6c757d;
        box-shadow: 0 4rpx 15rpx rgba(108, 117, 125, 0.2);
      }

      .logout-modal-cancel:active {
        transform: translateY(2rpx);
      }

      .logout-modal-confirm {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: #fff;
        box-shadow: 0 4rpx 15rpx rgba(231, 76, 60, 0.4);
      }

      .logout-modal-confirm:active {
        transform: translateY(2rpx);
      }
    }
  }

  .user-info-modal {
    padding: 40rpx;
    background-color: #fff;
    border-radius: 12rpx;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;

    .user-info-modal-title {
      font-size: 36rpx;
      font-weight: bold;
      text-align: center;
      margin-bottom: 30rpx;
    }

    .user-info-modal-content {
      flex: 1;
      width: 100%;
      padding: 20rpx;
      background-color: #f5f5f5;
      border-radius: 8rpx;
      font-size: 28rpx;
      color: #333;
      white-space: pre-wrap;
      word-break: break-all;
      overflow-y: auto;
    }

    .user-info-json {
      font-family: 'Courier New', Courier, monospace;
    }

    .user-info-modal-close {
      width: 90%;
      height: 80rpx;
      line-height: 80rpx;
      border-radius: 40rpx;
      background-color: #ff5000;
      color: #fff;
      font-size: 30rpx;
      margin-top: 30rpx;
    }
  }
</style>
