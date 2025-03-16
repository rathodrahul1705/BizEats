const BASE_URL = "http://127.0.0.1:8000/api";

const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${BASE_URL}/register/`,
    VERIFY_OTP: `${BASE_URL}/verify-otp/`,
    LOGIN: `${BASE_URL}/login/`,
    USER_PROFILE: `${BASE_URL}/user/`,
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
  },
};

export default API_ENDPOINTS;
