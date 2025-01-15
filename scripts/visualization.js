// Three.jsのセットアップ
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000811);
document.getElementById('container').appendChild(renderer.domElement);

// パイプラインの3D可視化
class Pipeline3D {
    constructor() {
        this.group = new THREE.Group();
        this.stages = new Map();
        this.connections = new Map();
        this.initialize();
    }

    initialize() {
        // ステージの位置を定義
        const stagePositions = {
            build: new THREE.Vector3(-4, 4, 0),
            test: new THREE.Vector3(0, 4, 0),
            deploy: new THREE.Vector3(4, 4, 0)
        };

        // 各ステージのノードを作成
        Object.entries(stagePositions).forEach(([stage, position]) => {
            const stageNode = this.createStageNode(stage);
            stageNode.position.copy(position);
            this.stages.set(stage, stageNode);
            this.group.add(stageNode);
        });

        // ステージ間の接続を作成
        this.createConnections(stagePositions);
        
        scene.add(this.group);
    }

    createStageNode(stage) {
        const node = new THREE.Group();

        // 中央の球体
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 32, 32),
            new THREE.MeshPhongMaterial({
                color: this.getStageColor(stage),
                emissive: this.getStageColor(stage),
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            })
        );
        node.add(sphere);

        // 周囲の軌道リング
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.6 + i * 0.2, 0.02, 16, 100),
                new THREE.MeshBasicMaterial({
                    color: this.getStageColor(stage),
                    transparent: true,
                    opacity: 0.3 - i * 0.1
                })
            );
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.y = Math.random() * Math.PI;
            node.add(ring);
        }

        return node;
    }

    createConnections(positions) {
        const stages = Object.keys(positions);
        for (let i = 0; i < stages.length - 1; i++) {
            const start = positions[stages[i]];
            const end = positions[stages[i + 1]];
            
            // ベジェ曲線のコントロールポイント
            const control = new THREE.Vector3(
                (start.x + end.x) / 2,
                start.y + 1,
                start.z
            );

            const curve = new THREE.QuadraticBezierCurve3(start, control, end);
            const points = curve.getPoints(50);
            
            // データフローライン
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0x7fdbff,
                transparent: true,
                opacity: 0.3
            });
            const line = new THREE.Line(geometry, material);
            this.connections.set(`${stages[i]}-${stages[i+1]}`, line);
            this.group.add(line);

            // フローパーティクル
            this.createFlowParticles(curve, stages[i], stages[i+1]);
        }
    }

    createFlowParticles(curve, fromStage, toStage) {
        const particles = new THREE.Group();
        const particleCount = 5;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: this.getStageColor(fromStage),
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            // パーティクルの初期位置をランダムに設定
            const t = i / particleCount;
            const position = curve.getPoint(t);
            particle.position.copy(position);
            
            // アニメーション用のデータを付加
            particle.userData = {
                curve: curve,
                speed: 0.001 + Math.random() * 0.001,
                t: t
            };
            
            particles.add(particle);
        }
        
        this.group.add(particles);
    }

    getStageColor(stage) {
        const colors = {
            build: 0x7fdbff,
            test: 0x00ff9d,
            deploy: 0xffbb33
        };
        return colors[stage] || 0x7fdbff;
    }

    update(time) {
        // ステージノードのアニメーション
        this.stages.forEach((node, stage) => {
            const isActive = taskManager.hasActiveTaskInStage(stage);
            
            // 中央球体のパルス効果
            const sphere = node.children[0];
            sphere.material.emissiveIntensity = isActive ? 
                0.5 + Math.sin(time * 3) * 0.3 : 0.3;

            // リングの回転
            node.children.slice(1).forEach((ring, i) => {
                ring.rotation.x += 0.01 * (i + 1);
                ring.rotation.y += 0.005 * (i + 1);
                ring.material.opacity = isActive ?
                    0.3 - (i * 0.1) + Math.sin(time * 2) * 0.1 :
                    0.2 - (i * 0.1);
            });
        });

        // フローパーティクルのアニメーション
        this.group.children.forEach(child => {
            if (child instanceof THREE.Group) {
                child.children.forEach(particle => {
                    if (particle.userData.curve) {
                        particle.userData.t += particle.userData.speed;
                        if (particle.userData.t > 1) particle.userData.t = 0;
                        
                        const position = particle.userData.curve.getPoint(particle.userData.t);
                        particle.position.copy(position);
                    }
                });
            }
        });
    }
}

// エージェントの設定
const agents = [
    { type: 'requirement', position: [-6, 0, 0], color: 0x7fdbff },
    { type: 'design', position: [-3, 0, 0], color: 0x00ff9d },
    { type: 'implementation', position: [0, 0, 0], color: 0xff3366 },
    { type: 'test', position: [3, 0, 0], color: 0xb4a7d6 },
    { type: 'documentation', position: [6, 0, 0], color: 0xffbb33 }
];

// エージェントメッシュの作成
const agentMeshes = agents.map(agent => {
    const group = new THREE.Group();

    // 中心球体
    const sphereGeometry = new THREE.IcosahedronGeometry(0.5, 2);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: agent.color,
        emissive: agent.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    group.add(sphere);

    // 軌道リング
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.7 + i * 0.2, 0.02, 16, 100),
            new THREE.MeshBasicMaterial({
                color: agent.color,
                transparent: true,
                opacity: 0.3 - i * 0.1
            })
        );
        ring.rotation.x = Math.random() * Math.PI;
        ring.rotation.y = Math.random() * Math.PI;
        group.add(ring);
    }

    group.position.set(...agent.position);
    scene.add(group);
    
    return {
        group,
        type: agent.type,
        materials: [sphereMaterial, ...group.children.slice(1).map(c => c.material)]
    };
});

// パイプラインの初期化
const pipeline3D = new Pipeline3D();

// ライティング
const light = new THREE.PointLight(0x7fdbff, 1, 100);
light.position.set(0, 10, 20);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// カメラ設定
camera.position.z = 15;

// アニメーションループ
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // エージェントのアニメーション
    agentMeshes.forEach(({ group, type, materials }) => {
        const isActive = taskManager.hasActiveTaskOfType(type);
        const rotationSpeed = isActive ? 0.02 : 0.005;
        
        group.rotation.y += rotationSpeed;
        
        materials[0].emissiveIntensity = isActive ? 
            0.5 + Math.sin(time * 3) * 0.3 : 0.3;

        group.children.slice(1).forEach((ring, i) => {
            ring.rotation.x += rotationSpeed * (i + 1) * 0.5;
            ring.rotation.y += rotationSpeed * (i + 1) * 0.3;
            materials[i + 1].opacity = isActive ?
                0.3 - (i * 0.1) + Math.sin(time * 2) * 0.1 :
                0.2 - (i * 0.1);
        });
    });

    // パイプラインのアニメーション
    pipeline3D.update(time);

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

// アニメーション開始
animate();