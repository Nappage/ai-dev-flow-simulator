class FlowLog {
    constructor(maxEntries = 10) {
        this.messages = [];
        this.maxEntries = maxEntries;
    }

    addMessage(message) {
        const entry = {
            timestamp: new Date().toLocaleTimeString(),
            message: message
        };
        this.messages.unshift(entry);
        if (this.messages.length > this.maxEntries) {
            this.messages.pop();
        }
        this.updateUI();
    }

    updateUI() {
        const logContainer = document.getElementById('flow-log');
        logContainer.innerHTML = this.messages.map(entry =>
            `<div class="flow-message">[${entry.timestamp}] ${entry.message}</div>`
        ).join('');
    }
}