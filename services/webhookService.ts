
import { CreationHistoryItem, WebhookConfig } from "../types";

const STORAGE_KEY = 'gemini_studio_webhook_config';

export const getWebhookConfig = (): WebhookConfig => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { url: '', enabled: false };
};

export const saveWebhookConfig = (config: WebhookConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const triggerWebhook = async (item: CreationHistoryItem) => {
    const config = getWebhookConfig();
    if (!config.enabled || !config.url) return;

    try {
        // Strip large base64 data if necessary for specific webhooks, 
        // but usually N8N handles it if increased body size limit.
        // We send the full item.
        
        // Important: Don't await this to block UI, fire and forget
        fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: 'asset_created',
                timestamp: new Date().toISOString(),
                ...item
            })
        }).catch(err => console.error("Webhook trigger failed", err));
    } catch (e) {
        console.error("Webhook error", e);
    }
};
