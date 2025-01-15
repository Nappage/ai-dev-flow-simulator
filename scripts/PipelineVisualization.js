class PipelineVisualization {
    constructor() {
        // ステージ要素の参照を保持
        this.stages = {
            build: document.getElementById('build-stage'),
            test: document.getElementById('test-stage'),
            deploy: document.getElementById('deploy-stage')
        };

        // メトリクス要素の参照
        this.metrics = {
            buildSuccessRate: document.getElementById('build-success-rate'),
            buildAvgTime: document.getElementById('build-avg-time'),
            testCoverage: document.getElementById('test-coverage'),
            testFailed: document.getElementById('test-failed'),
            deploySuccessRate: document.getElementById('deploy-success-rate'),
            deployEnvironment: document.getElementById('deploy-environment')
        };

        // パイプラインログ
        this.logsContainer = document.getElementById('pipeline-logs-content');
        
        // 統計データ
        this.stats = {
            totalBuilds: 0,
            successfulBuilds: 0,
            totalTests: 0,
            failedTests: 0,
            deployments: 0,
            successfulDeployments: 0
        };

        // アニメーション用の3Dオブジェクト
        this.pipelineObjects = new Map();
        this.initializePipeline3D();
    }

    // パイプラインの3D表現を初期化
    initializePipeline3D() {
        const pipelineGroup = new THREE.Group();
        
        // ステージごとのノードを作成
        const stagePositions = {
            build: new THREE.Vector3(-4, 2, 0),
            test: new THREE.Vector3(0, 2, 0),
            deploy: new THREE.Vector3(4, 2, 0)
        };

        Object.entries(stagePositions).forEach(([stage, position]) => {
            const node = this.createPipelineNode(stage);
            node.position.copy(position);
            pipelineGroup.add(node);
            this.pipelineObjects.set(stage, node);
        });

        // ステージ間の接続線を作成
        this.createPipelineConnections(stagePositions);

        scene.add(pipelineGroup);
    }

    // パイプラインノードの作成
    createPipelineNode(stage) {
        const group = new THREE.Group();

        // 中心球体
        const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: this.getStageColor(stage),
            emissive: this.getStageColor(stage),
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        group.add(sphere);

        // 外側のリング
        const ringGeometry = new THREE.TorusGeometry(0.5, 0.02, 16, 100);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.getStageColor(stage),
            transparent: true,
            opacity: 0.3
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        return group;
    }

    // パイプラインの接続線を作成
    createPipelineConnections(positions) {
        const stages = Object.keys(positions);
        for (let i = 0; i < stages.length - 1; i++) {
            const start = positions[stages[i]];
            const end = positions[stages[i + 1]];
            
            const points = [];
            points.push(start);
            // 制御点を追加してカーブを作成
            const control = new THREE.Vector3(
                (start.x + end.x) / 2,
                start.y + 1,
                start.z
            );
            points.push(control);
            points.push(end);

            const curve = new THREE.QuadraticBezierCurve3(start, control, end);
            const geometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
            const material = new THREE.MeshPhongMaterial({
                color: 0x7fdbff,
                transparent: true,
                opacity: 0.3
            });
            const tube = new THREE.Mesh(geometry, material);
            scene.add(tube);
        }
    }

    // ステージの色を取得
    getStageColor(stage) {
        const colors = {
            build: 0x7fdbff,
            test: 0x00ff9d,
            deploy: 0xffbb33
        };
        return colors[stage] || 0x7fdbff;
    }

    // パイプラインの状態を更新
    updatePipelineState(task) {
        if (!task.pipeline) return;

        // ステージの状態を更新
        Object.entries(this.stages).forEach(([stage, element]) => {
            const stageData = task.pipeline.stages.get(stage);
            if (stageData) {
                this.updateStageUI(stage, stageData.status, task);
            }
        });

        // メトリクスを更新
        this.updateMetrics(task);

        // 3Dビジュアライゼーションを更新
        this.updatePipeline3D(task);
    }

    // ステージのUI要素を更新
    updateStageUI(stage, status, task) {
        const element = this.stages[stage];
        if (!element) return;

        // クラスを更新
        element.className = 'stage ' + status.toLowerCase();
        
        // プログレスバーを更新
        const statusBar = element.querySelector('.stage-status');
        if (statusBar) {
            statusBar.style.width = this.getStageProgress(stage, task) + '%';
        }

        // メトリクスを更新
        this.updateStageMetrics(stage, task);
    }

    // ステージの進捗を計算
    getStageProgress(stage, task) {
        const stageData = task.pipeline.stages.get(stage);
        if (!stageData || stageData.status === PipelineStatus.WAITING) return 0;
        if (stageData.status === PipelineStatus.SUCCESS) return 100;
        
        // 実行中の場合は経過時間から進捗を計算
        const elapsed = Date.now() - stageData.startTime;
        const estimated = this.getEstimatedDuration(stage);
        return Math.min(100, (elapsed / estimated) * 100);
    }

    // ステージごとの推定所要時間
    getEstimatedDuration(stage) {
        const durations = {
            build: 3000,
            test: 2000,
            deploy: 2000
        };
        return durations[stage] || 2000;
    }

    // パイプラインのメトリクスを更新
    updateMetrics(task) {
        const metrics = task.pipeline.metrics;
        
        // ビルドメトリクス
        if (this.metrics.buildSuccessRate) {
            this.metrics.buildSuccessRate.textContent = 
                Math.round(this.stats.successfulBuilds / Math.max(1, this.stats.totalBuilds) * 100) + '%';
        }
        if (this.metrics.buildAvgTime) {
            this.metrics.buildAvgTime.textContent = 
                Math.round(metrics.buildTime / 1000) + 's';
        }

        // テストメトリクス
        if (this.metrics.testCoverage) {
            this.metrics.testCoverage.textContent = 
                Math.round(metrics.testCoverage) + '%';
        }
        if (this.metrics.testFailed) {
            this.metrics.testFailed.textContent = 
                metrics.failedTests;
        }

        // デプロイメトリクス
        if (this.metrics.deploySuccessRate) {
            this.metrics.deploySuccessRate.textContent = 
                Math.round(this.stats.successfulDeployments / Math.max(1, this.stats.deployments) * 100) + '%';
        }
    }

    // 3Dビジュアライゼーションを更新
    updatePipeline3D(task) {
        task.pipeline.stages.forEach((stageData, stageName) => {
            const node = this.pipelineObjects.get(stageName);
            if (!node) return;

            // ステージの状態に応じて視覚効果を更新
            const sphereMaterial = node.children[0].material;
            const ringMaterial = node.children[1].material;

            switch (stageData.status) {
                case PipelineStatus.RUNNING:
                    sphereMaterial.emissiveIntensity = 0.8;
                    ringMaterial.opacity = 0.6;
                    break;
                case PipelineStatus.SUCCESS:
                    sphereMaterial.emissiveIntensity = 0.5;
                    ringMaterial.opacity = 0.3;
                    break;
                case PipelineStatus.FAILED:
                    sphereMaterial.color.setHex(0xff4444);
                    sphereMaterial.emissive.setHex(0xff4444);
                    sphereMaterial.emissiveIntensity = 0.8;
                    break;
                default:
                    sphereMaterial.emissiveIntensity = 0.2;
                    ringMaterial.opacity = 0.2;
            }
        });
    }

    // パイプラインログを追加
    addLog(message, stage, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${stage} ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        this.logsContainer.insertBefore(logEntry, this.logsContainer.firstChild);
        
        // ログの最大数を制限
        while (this.logsContainer.children.length > 50) {
            this.logsContainer.removeChild(this.logsContainer.lastChild);
        }
    }

    // アニメーションの更新
    animate(time) {
        // ノードのアニメーション
        this.pipelineObjects.forEach((node) => {
            // リングの回転
            if (node.children[1]) {
                node.children[1].rotation.z += 0.01;
            }
        });
    }
}

// グローバルインスタンスの作成
const pipelineVisualization = new PipelineVisualization();
