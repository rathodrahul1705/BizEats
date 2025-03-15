const BASE_URL = "http://127.0.0.1:8000/api";

const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${BASE_URL}/register/`,
    VERIFY_OTP: `${BASE_URL}/verify-otp/`,
    LOGIN: `${BASE_URL}/login/`,
    USER_PROFILE: `${BASE_URL}/user/`,
  },
  RESTAURANT: {
    STEP_ONE: `${BASE_URL}/restaurant/store/step-one/`,
    STEP_TWO: `${BASE_URL}/restaurant/store/step-two/`,
    STEP_THREE: `${BASE_URL}/restaurant/store/step-three/`,
    STEP_FOUR: `${BASE_URL}/restaurant/store/step-four/`,
    BY_USER: (userId) => `${BASE_URL}/restaurants/status/${userId}/`,
  },
};

export default API_ENDPOINTS;
