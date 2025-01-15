// Enhanced TaskManager with Pipeline Integration
class TaskManager {
    constructor() {
        this.tasks = new Map();
        this.activeTaskLimit = 3;
        this.pipeline = new Pipeline();
        this.systemResources = {
            cpu: 0,
            memory: 0,
            developers: 5,
            buildServers: 2,
            testEnvironments: 3
        };
        this.resourceAllocation = new Map();
        this.metrics = {
            completedTasks: 0,
            averageLeadTime: 0,
            buildSuccessRate: 0,
            testCoverage: 0,
            deploymentFrequency: 0
        };
        this.eventListeners = new Map();
    }

    // イベントリスナーの登録
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(callback);
    }

    // イベントの発火
    emit(eventName, data) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    // リソースの割り当て
    allocateResources(taskId, requirements) {
        const available = { ...this.systemResources };
        this.resourceAllocation.forEach((resources) => {
            Object.keys(resources).forEach(key => {
                available[key] -= resources[key];
            });
        });

        // 必要なリソースが利用可能か確認
        for (const [resource, amount] of Object.entries(requirements)) {
            if (available[resource] < amount) {
                return false;
            }
        }

        // リソースの割り当て
        this.resourceAllocation.set(taskId, requirements);
        return true;
    }

    // リソースの解放
    releaseResources(taskId) {
        this.resourceAllocation.delete(taskId);
    }

    // タスクの作成
    createTask(id, name, type, priority = Priority.MEDIUM) {
        const task = new Task(id, name, type, priority);
        this.tasks.set(id, task);
        
        // タスクの作成イベントを発火
        this.emit('taskCreated', { task });
        
        return task;
    }

    // パイプラインの開始
    async startPipeline(task) {
        if (task.type !== TaskType.IMPLEMENTATION || task.status !== TaskStatus.COMPLETED) {
            return false;
        }

        const buildResources = {
            buildServers: 1,
            cpu: 20,
            memory: 30
        };

        if (!this.allocateResources(`${task.id}-build`, buildResources)) {
            return false;
        }

        task.status = TaskStatus.BUILD_PENDING;
        this.emit('pipelineStarted', { task });

        // ビルドステージの開始
        await this.startBuildStage(task);
        return true;
    }

    // ビルドステージの実行
    async startBuildStage(task) {
        task.status = TaskStatus.BUILDING;
        this.emit('buildStarted', { task });

        const buildTime = Math.random() * 3000 + 2000;
        await new Promise(resolve => setTimeout(resolve, buildTime));

        const success = Math.random() > 0.1;
        if (success) {
            this.releaseResources(`${task.id}-build`);
            await this.startTestStage(task);
        } else {
            task.status = TaskStatus.FAILED;
            this.emit('buildFailed', { task });
        }
    }

    // テストステージの実行
    async startTestStage(task) {
        const testResources = {
            testEnvironments: 1,
            cpu: 15,
            memory: 25
        };

        if (!this.allocateResources(`${task.id}-test`, testResources)) {
            task.status = TaskStatus.BLOCKED;
            return;
        }

        task.status = TaskStatus.TESTING;
        this.emit('testStarted', { task });

        const testTime = Math.random() * 2000 + 1000;
        await new Promise(resolve => setTimeout(resolve, testTime));

        const success = Math.random() > 0.15;
        this.releaseResources(`${task.id}-test`);

        if (success) {
            await this.startDeployStage(task);
        } else {
            task.status = TaskStatus.FAILED;
            this.emit('testFailed', { task });
        }
    }

    // デプロイステージの実行
    async startDeployStage(task) {
        task.status = TaskStatus.DEPLOYING;
        this.emit('deployStarted', { task });

        const deployTime = Math.random() * 2000 + 1000;
        await new Promise(resolve => setTimeout(resolve, deployTime));

        const success = Math.random() > 0.05;
        if (success) {
            task.status = TaskStatus.COMPLETED;
            this.emit('deploySucceeded', { task });
        } else {
            task.status = TaskStatus.FAILED;
            this.emit('deployFailed', { task });
        }
    }

    // メトリクスの更新
    updateMetrics() {
        const tasks = Array.from(this.tasks.values());
        const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
        
        this.metrics.completedTasks = completedTasks.length;
        
        if (completedTasks.length > 0) {
            // 平均リードタイム
            const totalLeadTime = completedTasks.reduce((sum, task) => {
                return sum + (task.timeMetrics.completionTime - task.timeMetrics.startTime);
            }, 0);
            this.metrics.averageLeadTime = totalLeadTime / completedTasks.length;

            // ビルド成功率
            const buildsAttempted = tasks.filter(t => 
                t.type === TaskType.IMPLEMENTATION && 
                (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.FAILED)
            ).length;
            const successfulBuilds = tasks.filter(t => 
                t.type === TaskType.IMPLEMENTATION && 
                t.status === TaskStatus.COMPLETED
            ).length;
            this.metrics.buildSuccessRate = (successfulBuilds / buildsAttempted) * 100;

            // デプロイ頻度（1日あたり）
            const now = Date.now();
            const deploysLast24h = completedTasks.filter(t => 
                now - t.timeMetrics.completionTime < 24 * 60 * 60 * 1000
            ).length;
            this.metrics.deploymentFrequency = deploysLast24h;
        }
    }

    // 定期的な更新
    update() {
        this.updateMetrics();
        this.emit('metricsUpdated', { metrics: this.metrics });
    }
}
