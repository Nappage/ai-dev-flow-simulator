// Three.jsのセットアップ
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000811);
document.getElementById('container').appendChild(renderer.domElement);

// エージェントの基本設定
const agentTypes = [
    {
        type: 'requirement',
        position: [-4, 4, 0],
        color: 0x7fdbff,
        tasks: TaskType.REQUIREMENT
    },
    {
        type: 'design',
        position: [0, 4, 0],
        color: 0x00ff9d,
        tasks: TaskType.DESIGN
    },
    {
        type: 'implementation',
        position: [4, 4, 0],
        color: 0xff3366,
        tasks: TaskType.IMPLEMENTATION
    },
    {
        type: 'review',
        position: [-4, -4, 0],
        color: 0xffbb33,
        tasks: TaskType.REVIEW
    },
    {
        type: 'test',
        position: [0, -4, 0],
        color: 0xb4a7d6,
        tasks: TaskType.TEST
    },
    {
        type: 'documentation',
        position: [4, -4, 0],
        color: 0x00ff9d,
        tasks: TaskType.DOCUMENTATION
    }
];

// ホログラム効果のシェーダー
const hologramShader = {
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec3 baseColor;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
            float scanline = sin(vPosition.y * 50.0 + time * 5.0) * 0.1 + 0.9;
            float edge = sin(time * 2.0) * 0.1 + 0.9;
            vec3 color = baseColor * scanline * edge;
            float alpha = 0.7 + 0.3 * sin(vUv.y * 50.0 + time * 3.0);
            gl_FragColor = vec4(color, alpha);
        }
    `
};

// エージェントメッシュの作成
function createAgentMesh(agentType) {
    const group = new THREE.Group();

    // 中心の球体
    const sphereGeometry = new THREE.IcosahedronGeometry(0.5, 2);
    const sphereMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(agentType.color) }
        },
        vertexShader: hologramShader.vertexShader,
        fragmentShader: hologramShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    group.add(sphere);

    // 回転リング
    for (let i = 0; i < 3; i++) {
        const ringGeometry = new THREE.TorusGeometry(0.8 + i * 0.2, 0.02, 16, 100);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: agentType.color,
            transparent: true,
            opacity: 0.3 - i * 0.1
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.random() * Math.PI;
        ring.rotation.y = Math.random() * Math.PI;
        group.add(ring);
    }

    // 情報パネル
    const panelGeometry = new THREE.PlaneGeometry(1.5, 0.5);
    const panelMaterial = new THREE.MeshBasicMaterial({
        color: agentType.color,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.z = 1;
    group.add(panel);

    group.position.set(...agentType.position);
    scene.add(group);

    return {
        group,
        materials: [sphereMaterial, ...group.children.slice(1).map(child => child.material)],
        type: agentType.type
    };
}

// エージェントの生成
const agents = agentTypes.map(createAgentMesh);

// データフローラインの作成
const dataFlowLines = [];
agentTypes.forEach((agent1, i) => {
    agentTypes.forEach((agent2, j) => {
        if (i < j) {
            const geometry = new THREE.BufferGeometry();
            const points = [
                new THREE.Vector3(...agent1.position),
                new THREE.Vector3(...agent2.position)
            ];
            geometry.setFromPoints(points);

            const material = new THREE.LineDashedMaterial({
                color: 0x7fdbff,
                dashSize: 0.3,
                gapSize: 0.1,
                transparent: true,
                opacity: 0.3
            });

            const line = new THREE.Line(geometry, material);
            line.computeLineDistances();
            scene.add(line);
            dataFlowLines.push({ line, material });
        }
    });
});

// パーティクルシステム
function createParticleSystem() {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 20;
        positions[i + 1] = (Math.random() - 0.5) * 20;
        positions[i + 2] = (Math.random() - 0.5) * 20;

        const color = new THREE.Color(0x7fdbff);
        color.setHSL(Math.random(), 0.8, 0.8);
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });

    return new THREE.Points(geometry, material);
}

const particles = createParticleSystem();
scene.add(particles);

// ライティング
const light = new THREE.PointLight(0x7fdbff, 1, 100);
light.position.set(0, 0, 20);
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
    agents.forEach(agent => {
        // シェーダーの時間更新
        agent.materials[0].uniforms.time.value = time;

        // アクティブ状態の確認
        const isActive = Array.from(taskManager.tasks.values()).some(task =>
            task.type === agent.type && 
            (task.status === TaskStatus.IN_PROGRESS || 
             task.status === TaskStatus.ANALYZING ||
             task.status === TaskStatus.IN_REVIEW)
        );

        // 回転速度とエフェクト強度の調整
        const rotationSpeed = isActive ? 0.02 : 0.005;
        agent.group.rotation.y += rotationSpeed;

        // リングのアニメーション
        for (let i = 1; i <= 3; i++) {
            const ring = agent.group.children[i];
            ring.rotation.x += rotationSpeed * (i * 0.5);
            ring.rotation.y += rotationSpeed * (i * 0.3);
            agent.materials[i].opacity = 0.3 + Math.sin(time * 2 + i) * 0.1;
        }
    });

    // データフローラインのアニメーション
    dataFlowLines.forEach(({ material }) => {
        material.dashOffset -= 0.1;
        material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
    });

    // パーティクルのアニメーション
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time + positions[i]) * 0.01;
        positions[i] += Math.cos(time + positions[i + 1]) * 0.01;

        if (Math.abs(positions[i]) > 10) positions[i] *= 0.95;
        if (Math.abs(positions[i + 1]) > 10) positions[i + 1] *= 0.95;
        if (Math.abs(positions[i + 2]) > 10) positions[i + 2] *= 0.95;
    }
    particles.geometry.attributes.position.needsUpdate = true;

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