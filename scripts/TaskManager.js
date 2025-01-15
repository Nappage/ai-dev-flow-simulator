            .sort((a, b) => {
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

        // アクティブタスクの更新とリソース使用量の計算
        this.tasks.forEach(task => {
            if (task.status === TaskStatus.IN_PROGRESS || 
                task.status === TaskStatus.ANALYZING) {
                activeCount++;
                this.systemResources.cpu += task.resourceRequirements.cpu;
                this.systemResources.memory += task.resourceRequirements.memory;
                usedDevelopers += task.resourceRequirements.developers;
                
                // タスクの進捗更新
                if (task.updateProgress(deltaTime * this.getProgressRate(task))) {
                    flowLog.addMessage(`${task.name}: ${Math.floor(task.progress)}%完了`);
                }
            }
            // レビュープロセスの処理
            else if (task.status === TaskStatus.IN_REVIEW) {
                this.processReview(task);
            }
        });

        // 新しいタスクのアクティブ化
        while (activeCount < this.activeTaskLimit && 
               usedDevelopers < this.systemResources.developers && 
               taskQueue.length > 0) {
            const nextTask = taskQueue.shift();
            if (usedDevelopers + nextTask.resourceRequirements.developers <= this.systemResources.developers) {
                nextTask.start();
                activeCount++;
                usedDevelopers += nextTask.resourceRequirements.developers;
                flowLog.addMessage(`${nextTask.name} 開始`);
            }
        }

        this.updateMetrics();
        this.updateUI();
    }

    // レビュープロセスの処理
    processReview(task) {
        if (task.reviewComments.length === 0) {
            // レビューコメント生成のシミュレーション
            if (Math.random() < 0.3) {  // 30%の確率でレビューコメント
                const severity = Math.random() < 0.3 ? 'major' : 'minor';
                task.addReviewComment('reviewer1', 
                    `${severity === 'major' ? '重要な' : '軽微な'}修正が必要です`, 
                    severity);
                task.handleReviewFeedback(severity);
                flowLog.addMessage(`${task.name}: レビューフィードバック受信`);
            } else {
                task.complete();
                flowLog.addMessage(`${task.name}: レビュー完了`);
            }
        }
    }

    // 進捗率の計算（タスクの種類や状況に応じて変動）
    getProgressRate(task) {
        let baseRate = 1.0;

        // タスクタイプによる調整
        const typeRates = {
            [TaskType.REQUIREMENT]: 0.8,
            [TaskType.DESIGN]: 0.9,
            [TaskType.IMPLEMENTATION]: 1.0,
            [TaskType.TEST]: 1.2,
            [TaskType.DOCUMENTATION]: 1.1
        };
        baseRate *= typeRates[task.type] || 1.0;

        // 技術的負債による影響
        baseRate *= (1 - (task.qualityMetrics.technicalDebt / 200));

        // チーム規模による調整（開発者数が多いほど若干効率が下がる）
        const developerEfficiency = 1 - (task.resourceRequirements.developers - 1) * 0.1;
        baseRate *= Math.max(0.5, developerEfficiency);

        return baseRate;
    }

    // メトリクスの更新
    updateMetrics() {
        let totalQuality = 0;
        let totalTasks = 0;
        let totalTechnicalDebt = 0;
        let totalReviewIterations = 0;

        this.tasks.forEach(task => {
            if (task.status === TaskStatus.COMPLETED) {
                totalQuality += task.qualityMetrics.codeQuality;
                totalTechnicalDebt += task.qualityMetrics.technicalDebt;
                totalReviewIterations += task.reviewIterations;
                totalTasks++;
            }
        });

        this.metrics.completedTasks = totalTasks;
        this.metrics.averageCodeQuality = totalTasks > 0 ? totalQuality / totalTasks : 100;
        this.metrics.totalTechnicalDebt = totalTechnicalDebt;
        this.metrics.totalReviewIterations = totalReviewIterations;
    }

    // UI更新
    updateUI() {
        // タスクツリーの更新
        const treeContainer = document.getElementById('task-tree');
        treeContainer.innerHTML = '';
        
        const renderTask = (task, level = 0) => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item priority-${task.priority}`;
            
            const header = document.createElement('div');
            header.className = 'task-header';
            
            const statusIndicator = document.createElement('span');
            statusIndicator.className = `status-indicator status-${task.status}`;
            
            const title = document.createElement('span');
            title.textContent = `${task.name} (${Math.floor(task.progress)}%)`;
            
            const metrics = document.createElement('div');
            metrics.className = 'task-metrics';
            if (task.type === TaskType.IMPLEMENTATION) {
                metrics.innerHTML = `
                    <div>品質: ${Math.floor(task.qualityMetrics.codeQuality)}%</div>
                    <div>カバレッジ: ${Math.floor(task.qualityMetrics.testCoverage)}%</div>
                    <div>負債: ${Math.floor(task.qualityMetrics.technicalDebt)}</div>
                `;
            }
            
            header.appendChild(statusIndicator);
            header.appendChild(title);
            taskElement.appendChild(header);
            taskElement.appendChild(metrics);
            
            const progress = document.createElement('div');
            progress.className = 'progress-bar';
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressFill.style.width = `${task.progress}%`;
            progress.appendChild(progressFill);
            taskElement.appendChild(progress);
            
            if (task.reviewComments.length > 0) {
                const reviewInfo = document.createElement('div');
                reviewInfo.className = 'review-info';
                reviewInfo.textContent = `レビューコメント: ${task.reviewComments.length}件`;
                taskElement.appendChild(reviewInfo);
            }
            
            if (task.subtasks.size > 0) {
                const subtasksContainer = document.createElement('div');
                subtasksContainer.className = 'subtask-container';
                task.subtasks.forEach(subtask => {
                    subtasksContainer.appendChild(renderTask(subtask, level + 1));
                });
                taskElement.appendChild(subtasksContainer);
            }
            
            return taskElement;
        };

        // ルートタスクの描画
        this.tasks.forEach(task => {
            if (!task.parentTask) {
                treeContainer.appendChild(renderTask(task));
            }
        });

        // リソースメーターの更新
        document.getElementById('cpu-meter').style.width = 
            `${this.systemResources.cpu}%`;
        document.getElementById('memory-meter').style.width = 
            `${this.systemResources.memory}%`;
            
        // 開発者リソースメーターの更新
        const devMeter = document.getElementById('developer-meter');
        if (devMeter) {
            devMeter.style.width = 
                `${(this.getUsedDevelopers() / this.systemResources.developers) * 100}%`;
        }
    }

    // 使用中の開発者数を計算
    getUsedDevelopers() {
        return Array.from(this.tasks.values())
            .filter(task => task.status === TaskStatus.IN_PROGRESS || 
                          task.status === TaskStatus.ANALYZING)
            .reduce((sum, task) => sum + task.resourceRequirements.developers, 0);
    }

    onTaskCompleted(task) {
        flowLog.addMessage(`${task.name} 完了`);
        // 依存タスクの状態更新
        this.tasks.forEach(t => {
            if (t.dependencies.has(task.id) && t.status === TaskStatus.PENDING) {
                const canStart = Array.from(t.dependencies)
                    .every(depId => this.getTask(depId).status === TaskStatus.COMPLETED);
                if (canStart) {
                    flowLog.addMessage(`${t.name} 開始可能`);
                }
            }
        });
    }
}

// グローバルインスタンスの作成
const taskManager = new TaskManager();
