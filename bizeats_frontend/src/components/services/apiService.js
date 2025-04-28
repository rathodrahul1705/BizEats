import API_ENDPOINTS from "../../components/config/apiConfig";

const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem("refresh");

    if (!refreshToken) throw new Error("No refresh token available");

    const response = await fetch(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Token refresh failed");
    }

    const data = await response.json();
    localStorage.setItem("access", data.access);
    return data.access;
};

const fetchData = async (url, method = "GET", body = null, token = null, isFormData = false) => {
    const makeRequest = async (accessToken) => {
        const headers = {};

        if (accessToken) {
            headers["Authorization"] = `Bearer ${accessToken}`;
        }

        if (!isFormData) {
            headers["Content-Type"] = "application/json";
        }

        const options = {
            method,
            headers,
        };

        if (body) {
            options.body = isFormData ? body : JSON.stringify(body);
        }

        const response = await fetch(url, options);
        
        
        if (response.status === 401 && !url.includes("/token/refresh")) {
            throw new Error("UNAUTHORIZED"); // we'll catch this and handle refresh
        }

        const data = await response.json();

        if (!response.ok) {
            // throw new Error(data?.detail || "Something went wrong");
            return data;
        }

        return data;
    };

    try {
        const accessToken = token || localStorage.getItem("access");
        return await makeRequest(accessToken);
    } catch (error) {
        if (error.message === "UNAUTHORIZED") {
            try {
                const newToken = await refreshAccessToken();
                return await makeRequest(newToken);
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                throw refreshError;
            }
        }

        console.error("API Error:", error);
        throw error;
    }
};

export default fetchData;
