// Three.jsのセットアップ
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

// エージェントの設定
const agentTypes = [
    { type: 'architecture', position: [-3, 3, 0], color: 0x7fdbff },
    { type: 'code', position: [3, 3, 0], color: 0x00ff9d },
    { type: 'test', position: [-3, -3, 0], color: 0x7fdbff },
    { type: 'documentation', position: [3, -3, 0], color: 0x00ff9d }
];

// エージェントメッシュの作成
const agentMeshes = agentTypes.map(agentType => {
    const group = new THREE.Group();

    // 中心球体
    const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: agentType.color,
        emissive: agentType.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    group.add(sphere);

    // 回転リング
    const ringGeometry = new THREE.TorusGeometry(0.5, 0.02, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: agentType.color,
        transparent: true,
        opacity: 0.3
    });

    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.random() * Math.PI;
        ring.rotation.y = Math.random() * Math.PI;
        group.add(ring);
    }

    group.position.set(...agentType.position);
    scene.add(group);
    
    return { group, type: agentType.type, materials: [sphereMaterial, ringMaterial] };
});

// エージェント間のデータフローライン
const dataFlowLines = [];
agentTypes.forEach((agent1, i) => {
    agentTypes.forEach((agent2, j) => {
        if (i !== j) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...agent1.position),
                new THREE.Vector3(...agent2.position)
            ]);
            const material = new THREE.LineBasicMaterial({
                color: 0x7fdbff,
                transparent: true,
                opacity: 0.1
            });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            dataFlowLines.push({ line, material });
        }
    });
});

// ライティング
const light = new THREE.PointLight(0x7fdbff, 1, 100);
light.position.set(0, 0, 20);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// カメラ設定
camera.position.z = 15;

// グローバルインスタンス
const taskManager = new TaskManager();
const flowLog = new FlowLog();

// サンプルタスクの初期化
function initializeTasks() {
    // アーキテクチャ設計フェーズ
    const archDesign = taskManager.createTask('arch-main', 'システム設計', Priority.HIGH);
    archDesign.resourceRequirements = { cpu: 30, memory: 20 };

    const requirements = taskManager.createTask('arch-req', '要件分析', Priority.HIGH);
    requirements.resourceRequirements = { cpu: 20, memory: 15 };
    archDesign.addSubtask(requirements);

    const systemArch = taskManager.createTask('arch-sys', 'システムアーキテクチャ設計', Priority.HIGH);
    systemArch.resourceRequirements = { cpu: 25, memory: 20 };
    systemArch.addDependency(requirements);
    archDesign.addSubtask(systemArch);

    // コード生成フェーズ
    const codeGen = taskManager.createTask('code-main', 'コード生成', Priority.MEDIUM);
    codeGen.resourceRequirements = { cpu: 40, memory: 30 };
    codeGen.addDependency(archDesign);

    const coreImpl = taskManager.createTask('code-core', 'コア機能実装', Priority.MEDIUM);
    coreImpl.resourceRequirements = { cpu: 35, memory: 25 };
    codeGen.addSubtask(coreImpl);

    const apiImpl = taskManager.createTask('code-api', 'API実装', Priority.MEDIUM);
    apiImpl.resourceRequirements = { cpu: 30, memory: 20 };
    apiImpl.addDependency(coreImpl);
    codeGen.addSubtask(apiImpl);

    // テストフェーズ
    const testing = taskManager.createTask('test-main', 'テスト実行', Priority.MEDIUM);
    testing.resourceRequirements = { cpu: 35, memory: 40 };
    testing.addDependency(codeGen);

    const unitTest = taskManager.createTask('test-unit', 'ユニットテスト', Priority.MEDIUM);
    unitTest.resourceRequirements = { cpu: 25, memory: 20 };
    testing.addSubtask(unitTest);

    const integrationTest = taskManager.createTask('test-int', '統合テスト', Priority.MEDIUM);
    integrationTest.resourceRequirements = { cpu: 30, memory: 35 };
    integrationTest.addDependency(unitTest);
    testing.addSubtask(integrationTest);

    // ドキュメント生成フェーズ
    const documentation = taskManager.createTask('doc-main', 'ドキュメント生成', Priority.LOW);
    documentation.resourceRequirements = { cpu: 20, memory: 25 };
    documentation.addDependency(testing);
    documentation.addDependency(codeGen);

    const apiDoc = taskManager.createTask('doc-api', 'API仕様書作成', Priority.LOW);
    apiDoc.resourceRequirements = { cpu: 15, memory: 20 };
    documentation.addSubtask(apiDoc);

    const userDoc = taskManager.createTask('doc-user', 'ユーザーマニュアル作成', Priority.LOW);
    userDoc.resourceRequirements = { cpu: 15, memory: 20 };
    userDoc.addDependency(apiDoc);
    documentation.addSubtask(userDoc);
}

// アニメーションループ
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // エージェントのアニメーション
    agentMeshes.forEach(({ group, type, materials }) => {
        const isActive = Array.from(taskManager.tasks.values()).some(task => 
            task.status === TaskStatus.ACTIVE && 
            task.id.startsWith(type)
        );

        // 回転速度とエフェクト強度の調整
        const rotationSpeed = isActive ? 0.04 : 0.01;
        const emissiveIntensity = isActive ? 0.8 : 0.3;
        
        group.rotation.y += rotationSpeed;
        materials[0].emissiveIntensity = emissiveIntensity;

        // リングのアニメーション
        for (let i = 1; i < group.children.length; i++) {
            group.children[i].rotation.x += rotationSpeed;
            group.children[i].rotation.y += rotationSpeed;
            materials[1].opacity = 0.3 + Math.sin(time * 2) * 0.1;
        }
    });

    // データフローラインのアニメーション
    dataFlowLines.forEach(({ material }) => {
        material.opacity = 0.1 + Math.sin(time * 2) * 0.05;
    });

    // タスクの更新
    taskManager.updateTasks(0.016); // 約60FPS相当のデルタタイム

    // カメラの動き
    camera.position.x = Math.sin(time * 0.1) * 2;
    camera.position.y = Math.cos(time * 0.1) * 2;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
}

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// システムの初期化と開始
initializeTasks();
flowLog.addMessage('開発フロー初期化完了');
animate();