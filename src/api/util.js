// Function to get auth token from storage
export const getAuthToken = () => {
    try {
        return localStorage.getItem('auth_token');
    } catch (error) {
        return null;
    }
};

// Function to get auth headers
export const getAuthHeaders = (additionalHeaders = {}) => {
    const token = getAuthToken();
    const headers = {
        ...additionalHeaders,
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

// Function to handle API errors
export const handleApiError = async (response) => {
    if (!response.ok) {
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
            // Clear auth state
            try {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                // Trigger a custom event that components can listen to
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            } catch (error) {
                console.error('Error clearing auth state:', error);
            }
            throw new Error('Unauthorized. Please log in again.');
        }

        // Try to parse the error message from the response
        try {
            const errorData = await response.json();

            // Handle FastAPI validation errors which come in 'detail' field
            if (errorData.detail) {
                if (Array.isArray(errorData.detail)) {
                    // FastAPI validation errors are often arrays
                    const errorMessage = errorData.detail
                        .map((err) => `${err.loc.join(".")}: ${err.msg}`)
                        .join(", ");
                    throw new Error(`API Validation Error: ${errorMessage}`);
                } else {
                    throw new Error(`API Error: ${errorData.detail}`);
                }
            }

            // Handle general error message
            if (errorData.message) {
                throw new Error(`API Error: ${errorData.message}`);
            }

            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        } catch (parseError) {
            if (parseError instanceof SyntaxError) {
                // Could not parse the error response as JSON
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            throw parseError;
        }
    }
    return response.json();
};