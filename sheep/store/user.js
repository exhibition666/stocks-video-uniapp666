import { defineStore } from 'pinia';
import $share from '@/sheep/platform/share';
import { clone, cloneDeep } from 'lodash-es';
import cart from './cart';
import app from './app';
import { showAuthModal } from '@/sheep/hooks/useModal';
import UserApi from '@/sheep/api/member/user';
import PayWalletApi from '@/sheep/api/pay/wallet';
import OrderApi from '@/sheep/api/trade/order';
import CouponApi from '@/sheep/api/promotion/coupon';

// 默认用户信息
const defaultUserInfo = {
  avatar: '', // 头像
  nickname: '', // 昵称
  gender: 0, // 性别
  mobile: '', // 手机号
  point: 0, // 积分
  level: 0, // 会员等级
  levelName: '', // 会员等级名称
  createTime: '', // 注册时间
};

// 默认钱包信息
const defaultUserWallet = {
  balance: 0, // 余额
};

// 默认订单、优惠券等其他资产信息
const defaultNumData = {
  unusedCouponCount: 0,
  orderCount: {
    allCount: 0,
    unpaidCount: 0,
    undeliveredCount: 0,
    deliveredCount: 0,
    uncommentedCount: 0,
    afterSaleCount: 0,
  },
};

// 检查token是否存在且有效
const checkToken = () => {
  const token = uni.getStorageSync('token');
  // 如果token不存在，直接返回false
  if (!token) return false;
  
  // 这里可以添加token有效性检查，例如检查是否过期
  // 如果有JWT token，可以解析它检查exp字段
  
  return true;
};

const user = defineStore({
  id: 'user',
  state: () => ({
    userInfo: clone(defaultUserInfo), // 用户信息
    userWallet: clone(defaultUserWallet), // 用户钱包信息
    isLogin: checkToken(), // 登录状态，使用函数检查token有效性
    numData: cloneDeep(defaultNumData), // 用户其他数据
    lastUpdateTime: 0, // 上次更新时间
  }),

  actions: {
    // 检查登录状态
    checkLoginStatus() {
      const token = uni.getStorageSync('token');
      console.log('检查登录状态，token是否存在:', !!token);
      
      // 如果token存在但isLogin为false，或者token不存在但isLogin为true，则需要更新isLogin
      if ((!!token && !this.isLogin) || (!token && this.isLogin)) {
        console.log('更新登录状态:', !!token);
        this.isLogin = !!token;
      }
      
      return this.isLogin;
    },
    
    // 获取用户信息
    async getInfo() {
      // 先检查登录状态
      if (!this.checkLoginStatus()) {
        console.log('用户未登录，无法获取用户信息');
        return Promise.reject(new Error('用户未登录'));
      }
      
      try {
        console.log('调用API获取用户信息');
        const { code, data, msg } = await UserApi.getUserInfo();
        
        if (code !== 0) {
          console.error('获取用户信息失败:', msg);
          return Promise.reject(new Error(msg || '获取用户信息失败'));
        }
        
        if (!data) {
          console.error('获取用户信息成功，但数据为空');
          return Promise.reject(new Error('获取用户信息成功，但数据为空'));
        }
        
        console.log('获取用户信息成功:', JSON.stringify(data).substring(0, 100) + '...');
        this.userInfo = data;
        return Promise.resolve(data);
      } catch (error) {
        console.error('获取用户信息API调用失败:', error);
        // 如果API请求失败，可能是token无效，重置用户状态
        if (error.statusCode === 401 || (error.message && error.message.includes('unauthorized'))) {
          this.resetUserData();
        }
        return Promise.reject(error);
      }
    },

    // 获得用户钱包
    async getWallet() {
      // 先检查登录状态
      if (!this.checkLoginStatus()) {
        return Promise.reject(new Error('用户未登录'));
      }
      
      try {
        const { code, data } = await PayWalletApi.getPayWallet();
        if (code !== 0) {
          return;
        }
        this.userWallet = data;
        return Promise.resolve(data);
      } catch (error) {
        // 如果API请求失败，可能是token无效，重置用户状态
        if (error.statusCode === 401 || (error.message && error.message.includes('unauthorized'))) {
          this.resetUserData();
        }
        return Promise.reject(error);
      }
    },

    // 获取订单、优惠券等其他资产信息
    getNumData() {
      // 注释掉有问题的API调用，避免出现错误
      /* 
      OrderApi.getOrderCount().then((res) => {
        if (res.code === 0) {
          this.numData.orderCount = res.data;
        }
      });
      CouponApi.getUnusedCouponCount().then((res) => {
        if (res.code === 0) {
          this.numData.unusedCouponCount = res.data;
        }
      });
      */
    },

    // 设置 token
    setToken(token = '', refreshToken = '') {
      if (token === '') {
        this.isLogin = false;
        uni.removeStorageSync('token');
        uni.removeStorageSync('refresh-token');
      } else {
        this.isLogin = true;
        uni.setStorageSync('token', token);
        uni.setStorageSync('refresh-token', refreshToken);
        
        // 打印日志
        console.log('设置token成功，准备执行loginAfter');
        
        // 登录成功后执行loginAfter
        this.loginAfter();
      }
      return this.isLogin;
    },

    // 更新用户相关信息 (手动限流，5 秒之内不刷新)
    async updateUserData(forceUpdate = false) {
      // 先检查登录状态
      if (!this.checkLoginStatus()) {
        console.log('用户未登录，无法更新用户数据');
        this.resetUserData();
        return Promise.reject(new Error('用户未登录'));
      }
      
      console.log('开始更新用户数据，强制更新:', forceUpdate);
      
      // 如果强制更新，则忽略时间限制
      if (!forceUpdate) {
        // 防抖，5 秒之内不刷新
        const nowTime = new Date().getTime();
        if (this.lastUpdateTime + 5000 > nowTime) {
          console.log('距离上次更新时间不足5秒，跳过更新');
          return this.userInfo;
        }
      }
      
      this.lastUpdateTime = new Date().getTime();

      try {
        // 获取最新信息，只调用安全的API
        console.log('调用getInfo获取用户信息');
        const userInfo = await this.getInfo();
        
        if (!userInfo) {
          console.error('获取用户信息失败，userInfo为空');
          return Promise.reject(new Error('获取用户信息失败'));
        }
        
        console.log('调用getWallet获取钱包信息');
        const walletInfo = await this.getWallet();
        
        console.log('用户数据更新成功:', new Date().toLocaleTimeString());
        
        // 返回最新的用户信息
        return this.userInfo;
      } catch (error) {
        console.error('更新用户数据失败:', error);
        // 如果API请求失败，可能是token无效，重置用户状态
        if (error.statusCode === 401 || (error.message && error.message.includes('unauthorized'))) {
          this.resetUserData();
        }
        return Promise.reject(error);
      }
    },

    // 重置用户默认数据
    resetUserData() {
      // 清空 token
      this.setToken();
      // 清空用户相关的缓存
      this.userInfo = clone(defaultUserInfo);
      this.userWallet = clone(defaultUserWallet);
      this.numData = cloneDeep(defaultNumData);
      // 清空购物车的缓存
      cart().emptyList();
    },

    // 登录后，加载各种信息
    async loginAfter() {
      console.log('执行loginAfter，开始更新用户数据');
      
      try {
        // 强制更新用户数据
        await this.updateUserData(true);
        console.log('loginAfter中更新用户数据成功');
        
        // 加载购物车
        cart().getList();
        
        // 登录后设置全局分享参数
        $share.getShareInfo();
  
        // 提醒绑定手机号
        if (app().platform.bind_mobile && !this.userInfo.mobile) {
          showAuthModal('changeMobile');
        }
  
        // 绑定推广员
        $share.bindBrokerageUser();
        
        // 触发登录成功事件
        uni.$emit('userLogin:success');
        
        // 确保底部导航栏显示
        uni.$emit('updateTabbar');
        
        return this.userInfo;
      } catch (error) {
        console.error('loginAfter执行失败:', error);
        return Promise.reject(error);
      }
    },

    // 登出系统
    async logout() {
      this.resetUserData();
      return !this.isLogin;
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'user-store',
      },
    ],
  },
});

export default user;
