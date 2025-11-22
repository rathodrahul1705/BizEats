const BASE_URL = `${process.env.REACT_APP_API_URL}/api`;

const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${BASE_URL}/register/`,
    VERIFY_OTP: `${BASE_URL}/verify-otp/`,
    LOGIN: `${BASE_URL}/login/`,
    USER_PROFILE: `${BASE_URL}/user/`,
    REFRESH_TOKEN: `${BASE_URL}/token/refresh/`,
  },
  RESTAURANT: {
    BY_USER: (userId) => 
      userId ? `${BASE_URL}/restaurants/status/${userId}/` : `${BASE_URL}/restaurants/status/`,

    BY_RESTAURANT_ID: (restaurantId) => 
      restaurantId ? `${BASE_URL}/restaurant/${restaurantId}/` : `${BASE_URL}/restaurant/`,

    STEP_ONE: (restaurantId) => 
      restaurantId ? `${BASE_URL}/restaurant/store/step-one/${restaurantId}/` : `${BASE_URL}/restaurant/store/step-one/`,

    STEP_TWO: (restaurantId) => 
      restaurantId ? `${BASE_URL}/restaurant/store/step-two/${restaurantId}/` : `${BASE_URL}/restaurant/store/step-two/`,

    STEP_THREE: (restaurantId) => 
      restaurantId ? `${BASE_URL}/restaurant/store/step-three/${restaurantId}/` : `${BASE_URL}/restaurant/store/step-three/`,

    STEP_FOUR: (restaurantId) => 
      restaurantId ? `${BASE_URL}/restaurant/store/step-four/${restaurantId}/` : `${BASE_URL}/restaurant/store/step-four/`,

    RES_MENUE_STORE: (restaurantId) => 
      restaurantId ? `${BASE_URL}/restaurant/menue/store/${restaurantId}/` : `${BASE_URL}/api/restaurant/menue/store/`,

    RES_MENUE_LIST: (restaurantId) => 
      restaurantId ? `${BASE_URL}/restaurant/menue/list/${restaurantId}/` : `${BASE_URL}/api/restaurant/menue/list/`,

    RES_MENUE_DETAILS: (munuId) => 
      munuId ? `${BASE_URL}/restaurant/menue/details/${munuId}/` : `${BASE_URL}/api/restaurant/menue/details/`,

    RES_MENUE_UPDATE: (munuId,restaurant_id) => 
      munuId ? `${BASE_URL}/restaurant/menue/update/${munuId}/${restaurant_id}/` : `${BASE_URL}/api/restaurant/menue/update/`,

    RES_MENUE_DELETE: (munuId,restaurant_id) => 
      munuId ? `${BASE_URL}/menue/delete/${munuId}/${restaurant_id}/` : `${BASE_URL}/api/restaurant/menue/delete/`,

    RES_VENDOR_COUNT: `${BASE_URL}/order/vendor-dashboard-details/`,

    RES_STATUS_UPDATE: (restaurant_id) => `${BASE_URL}/restaurant/status-update/${restaurant_id}/`,

    RES_CATEGORY_STORE: (category_id) => 
      category_id ? `${BASE_URL}/categories/${category_id}/` : `${BASE_URL}/categories/`,

    RES_CATEGORY_DELETE: (category_id) => `${BASE_URL}/categories/${category_id}/`,
    RES_CATEGORY_GET: (restaurant_id) => `${BASE_URL}/categories/?restaurant_id=${restaurant_id}`,

  },

  HOME: {
    LIVE_RES_LIST: `${BASE_URL}/restaurant/live/list/`,
    CUSTOMER_REVIEW: `${BASE_URL}/customer-review/`,
  },

  ORDER: {

    // RES_MENU_LIST_BY_RES_ID: (restaurant_id,offer) => 
    //   restaurant_id ? `${BASE_URL}/restaurant/menu/list/${restaurant_id}/${offer}/` : `${BASE_URL}/restaurant/menu/list/`,

    RES_MENU_LIST_BY_RES_ID: (restaurant_id, offer) => {
      if (restaurant_id && offer) {
        return `${BASE_URL}/restaurant/menu/list/${restaurant_id}/${offer}/`;
      } else if (restaurant_id) {
        return `${BASE_URL}/restaurant/menu/list/${restaurant_id}/`;
      } else {
        return `${BASE_URL}/restaurant/menu/list/`;
      }
    },    

    ADD_TO_CART: `${BASE_URL}/restaurant/cart/add/`,
    GET_CART_DETAILS: `${BASE_URL}/restaurant/cart/list/`,

    GET_CART_ITEM_LIST: `${BASE_URL}/restaurant/cart/details/`,

    CLEAR_CART: `${BASE_URL}/restaurant/cart/clear/`,
    USER_ADDRESS_STORE: `${BASE_URL}/user_address/store/`,
    USER_ADDRESS_LIST: `${BASE_URL}/addresses/list/`,
    UPDATE_CART_USER: `${BASE_URL}/restaurant/cart/user/update/`,

    GET_ORDER_DETAILS: `${BASE_URL}/restaurant/order/details/`,
    UPDATE_ORDER_DETAILS: `${BASE_URL}/restaurant/order/details/update/`,

    VENDOR_ORDERS: `${BASE_URL}/restaurant/orders/details`,
    UPDATE_ORDER_STATUS: `${BASE_URL}/order/update-order-status/`,
    VALIDATE_COUPEN: `${BASE_URL}/order/apply-coupen-order/`

  },

  PAYMENT: {
    CREATE_ORDER: `${BASE_URL}/restaurant/order/create-order/`,
    VERIFY_PAYMENT: `${BASE_URL}/restaurant/order/verify-payment/`,
    MARKED_PAYMENT: (order_number) => `${BASE_URL}/restaurant/order/mark-paid/${order_number}/`,

  },

  TRACK: {
    TRACK_ORDER: `${BASE_URL}/order/track-order-details/`,
    ORDER_DETAILS: `${BASE_URL}/order/order-details/`,
    ORDER_LIVE_LOCATION: `${BASE_URL}/order/live-location-details/`,
    UPDATE_LIVE_LOCATION: `${BASE_URL}/order/update-location/`,
    GET_ACTTIVE_ORDER: `${BASE_URL}/order/active-orders/`,
  },
  
  CONTACT: {
    CONTACT_US: `${BASE_URL}/contact-us/`,
  },

  COUPONS: {
    CREATE: `${BASE_URL}/vendor/coupons/create/`,
    FETCH: `${BASE_URL}/vendor/coupons/`,
    DELETE: (coupon_id) => `${BASE_URL}/vendor/coupons/${coupon_id}/delete/`,
    UPDATE: (coupon_id) => `${BASE_URL}/vendor/coupons/${coupon_id}/update/`
  },

  OFFER: {
    CREATE: `${BASE_URL}/offers/`,
    FETCH: (restaurant_id) => `${BASE_URL}/offers/?restaurant_id=${restaurant_id}`,
    DELETE: (coupon_id) => `${BASE_URL}/offers/${coupon_id}/`,
    UPDATE: (coupon_id) => `${BASE_URL}/offers/${coupon_id}/`
  },

  PROFILE: {
    UPDATE: `${BASE_URL}/user-profile-update/`,
  },
  
  REVIEWS: {
    SUBMIT_REVIEW: `${BASE_URL}/order-review/update/`,
  },

  USER: {
    USER_LIST: `${BASE_URL}/user/user_list/`,
    CART_LIST: `${BASE_URL}/cart/cart_list/`,
  },

  TAGS: {
    CREATE: `${BASE_URL}/tags/create/`,
    FETCH_ALL: `${BASE_URL}/tags/list/`,
    UPDATE: (tag_id) => `${BASE_URL}/tags/update//${tag_id}/`,
    DELETE: (tag_id) => `${BASE_URL}/tags/delete/${tag_id}/`,
  },

  NOTIFICATION_TEMPLATES: {
    CREATE: `${BASE_URL}/notifications/create/`,
    FETCH_ALL: `${BASE_URL}/notifications/list/`,
    UPDATE: (template_id) => `${BASE_URL}/notifications/update/${template_id}/`,
    DELETE: (template_id) => `${BASE_URL}/notifications/delete/${template_id}/`,
    TOGGLE_STATUS: (template_id) => `${BASE_URL}/notifications/${template_id}/toggle-status/`,
  },


  NOTIFICATION_QUEUE: {
    CREATE: `${BASE_URL}/notifications/queue/create/`,
    FETCH_ALL: `${BASE_URL}/notifications/queue/list/`,
  },

  ASSIGNED_TAGS: {
    CREATE: `${BASE_URL}/user/assign-tags//`,
    FETCH_ALL: `${BASE_URL}/user/assigned-tags/list`,
  },

  DEVICES: {
    CREATE: `${BASE_URL}/device/register/`,
    FETCH_ALL: `${BASE_URL}/device/list/`,
    DELETE: (device_id) => `${BASE_URL}/device/delete/${device_id}/`,
  },

  NOTIFICATIONS: {
    SEND_IMMEDIATE: `${BASE_URL}/queue/prepare/`,
  },

};

export default API_ENDPOINTS;
