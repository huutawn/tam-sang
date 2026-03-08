import axios from "axios";

export interface UploadFileResponse {
    successful: number;
    failed: number;
    total: number;
    files: Array<{
        file_id: string;
        url: string;
        filename: string;
        size: number;
        content_type: string;
        checksum: string;
    }>;
}

export interface FileApiResponse {
    code: number;
    message: string;
    data: UploadFileResponse;
    timestamp: string;
    request_id: string;
}

export const FileService = {
    /**
     * Upload multiple files to file-service
     */
    uploadBatch: async (files: File[]): Promise<string[]> => {
        if (!files || files.length === 0) return [];

        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        // file-service runs on port 8083 locally
        try {
            const response = await axios.post<FileApiResponse>(
                "http://localhost:8083/files/upload/batch",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (!response.data.data || !response.data.data.files) {
                return [];
            }

            return response.data.data.files.map((f) => f.url);
        } catch (error) {
            console.error("Failed to upload files:", error);
            throw error;
        }
    },
};
