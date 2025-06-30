// Function to handle API errors
export const handleApiError = async (response) => {
    if (!response.ok) {
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