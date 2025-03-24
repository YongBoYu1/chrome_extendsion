// Backend communication service
export class BackendService {
    static BASE_URL = 'http://localhost:5001';

    static async pingServer() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/ping`);
            return await response.json();
        } catch (error) {
            console.error('Backend server error:', error);
            throw error;
        }
    }

    static async checkServerStatus() {
        try {
            const result = await this.pingServer();
            console.log('Backend server status:', result);
            return result.status === 'ok';
        } catch (error) {
            return false;
        }
    }
} 