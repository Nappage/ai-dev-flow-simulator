// タスクの状態定義の拡張
const TaskStatus = {
    PENDING: 'pending',
    ANALYZING: 'analyzing',
    IN_PROGRESS: 'in_progress',
    IN_REVIEW: 'in_review',
    REVIEW_FEEDBACK: 'review_feedback',
    BUILD_PENDING: 'build_pending',
    BUILDING: 'building',
    TESTING: 'testing',
    DEPLOY_PENDING: 'deploy_pending',
    DEPLOYING: 'deploying',
    BLOCKED: 'blocked',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// CI/CDステージの定義
const CICDStage = {
    BUILD: 'build',
    TEST: 'test',
    DEPLOY: 'deploy'
};

// パイプラインステータスの定義
const PipelineStatus = {
    SUCCESS: 'success',
    RUNNING: 'running',
    FAILED: 'failed',
    WAITING: 'waiting'
};

// タスクの種類定義の拡張
const TaskType = {
    REQUIREMENT: 'requirement',
    DESIGN: 'design',
    IMPLEMENTATION: 'implementation',
    REVIEW: 'review',
    TEST: 'test',
    DOCUMENTATION: 'documentation',
    BUILD: 'build',
    DEPLOYMENT: 'deployment'
};

class Pipeline {
    constructor() {
        this.stages = new Map();
        this.currentStage = null;
        this.status = PipelineStatus.WAITING;
        this.logs = [];
        this.metrics = {
            buildTime: 0,
            testCoverage: 0,
            failedTests: 0,
            deploymentTime: 0
        };
    }

    addStage(stage, config) {
        this.stages.set(stage, {
            status: PipelineStatus.WAITING,
            config,
            startTime: null,
            endTime: null,
            artifacts: new Map()
        });
    }

    async startStage(stage) {
        const stageData = this.stages.get(stage);
        if (!stageData) return false;

        stageData.status = PipelineStatus.RUNNING;
        stageData.startTime = Date.now();
        this.currentStage = stage;
        this.status = PipelineStatus.RUNNING;
        this.addLog(`Starting ${stage} stage`);

        return true;
    }

    completeStage(stage, success = true) {
        const stageData = this.stages.get(stage);
        if (!stageData) return false;

        stageData.status = success ? PipelineStatus.SUCCESS : PipelineStatus.FAILED;
        stageData.endTime = Date.now();
        this.addLog(`${stage} stage ${success ? 'completed' : 'failed'}`);

        if (!success) {
            this.status = PipelineStatus.FAILED;
            return false;
        }

        // 次のステージを探す
        const stageOrder = [CICDStage.BUILD, CICDStage.TEST, CICDStage.DEPLOY];
        const currentIndex = stageOrder.indexOf(stage);
        const nextStage = stageOrder[currentIndex + 1];

        if (nextStage) {
            this.startStage(nextStage);
        } else {
            this.status = PipelineStatus.SUCCESS;
            this.currentStage = null;
        }

        return true;
    }

    addLog(message) {
        this.logs.push({
            timestamp: new Date(),
            message,
            stage: this.currentStage
        });
    }

    updateMetrics(metrics) {
        Object.assign(this.metrics, metrics);
    }
}

class Task {
    constructor(id, name, type, priority = Priority.MEDIUM) {
        // ... 既存のコンストラクタコード ...
        this.pipeline = type === TaskType.IMPLEMENTATION ? new Pipeline() : null;
        this.buildArtifacts = new Map();
    }

    // 既存のメソッドは維持したまま、新しいメソッドを追加

    async startBuild() {
        if (!this.pipeline) return false;

        this.status = TaskStatus.BUILDING;
        await this.pipeline.startStage(CICDStage.BUILD);
        
        // ビルドプロセスのシミュレーション
        const buildTime = Math.random() * 3000 + 2000;
        setTimeout(() => {
            const success = Math.random() > 0.1; // 10%の確率で失敗
            this.completeBuild(success);
        }, buildTime);

        return true;
    }

    completeBuild(success) {
        if (success) {
            this.pipeline.completeStage(CICDStage.BUILD);
            this.status = TaskStatus.TESTING;
            this.startTests();
        } else {
            this.pipeline.completeStage(CICDStage.BUILD, false);
            this.status = TaskStatus.FAILED;
        }
    }

    async startTests() {
        if (!this.pipeline) return false;

        await this.pipeline.startStage(CICDStage.TEST);
        
        // テストプロセスのシミュレーション
        const testTime = Math.random() * 2000 + 1000;
        setTimeout(() => {
            const success = Math.random() > 0.15; // 15%の確率で失敗
            this.completeTests(success);
        }, testTime);

        return true;
    }

    completeTests(success) {
        if (success) {
            this.pipeline.completeStage(CICDStage.TEST);
            this.status = TaskStatus.DEPLOY_PENDING;
            this.startDeployment();
        } else {
            this.pipeline.completeStage(CICDStage.TEST, false);
            this.status = TaskStatus.FAILED;
        }
    }

    async startDeployment() {
        if (!this.pipeline) return false;

        this.status = TaskStatus.DEPLOYING;
        await this.pipeline.startStage(CICDStage.DEPLOY);
        
        // デプロイプロセスのシミュレーション
        const deployTime = Math.random() * 2000 + 1000;
        setTimeout(() => {
            const success = Math.random() > 0.05; // 5%の確率で失敗
            this.completeDeployment(success);
        }, deployTime);

        return true;
    }

    completeDeployment(success) {
        if (success) {
            this.pipeline.completeStage(CICDStage.DEPLOY);
            this.status = TaskStatus.COMPLETED;
        } else {
            this.pipeline.completeStage(CICDStage.DEPLOY, false);
            this.status = TaskStatus.FAILED;
        }
    }
}

// TaskManagerクラスの拡張
class TaskManager {
    constructor() {
        // ... 既存のコンストラクタコード ...
        this.pipelineMetrics = {
            totalBuilds: 0,
            successfulBuilds: 0,
            averageBuildTime: 0,
            averageTestCoverage: 0,
            deploymentSuccess: 0
        };
    }

    // 既存のメソッドを維持したまま、新しいメソッドを追加

    updatePipelineMetrics() {
        const implementationTasks = Array.from(this.tasks.values())
            .filter(task => task.type === TaskType.IMPLEMENTATION && task.pipeline);

        if (implementationTasks.length === 0) return;

        let totalBuildTime = 0;
        let totalTestCoverage = 0;
        let successfulBuilds = 0;
        let successfulDeploys = 0;

        implementationTasks.forEach(task => {
            if (task.pipeline.metrics.buildTime > 0) {
                totalBuildTime += task.pipeline.metrics.buildTime;
            }
            if (task.pipeline.status === PipelineStatus.SUCCESS) {
                successfulBuilds++;
            }
            totalTestCoverage += task.pipeline.metrics.testCoverage;
            if (task.status === TaskStatus.COMPLETED) {
                successfulDeploys++;
            }
        });

        this.pipelineMetrics = {
            totalBuilds: implementationTasks.length,
            successfulBuilds,
            averageBuildTime: totalBuildTime / implementationTasks.length,
            averageTestCoverage: totalTestCoverage / implementationTasks.length,
            deploymentSuccess: successfulDeploys / implementationTasks.length
        };
    }
}