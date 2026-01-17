import * as BABYLON from 'babylonjs';

export default class Goal {
    constructor(scene) {
        this.scene = scene;
        this.width = 7.32;
        this.height = 2.44;
        this.depth = 2.0;
        this.postRadius = 0.06;
    }

    create(position) {
        // Materials
        const postMat = new BABYLON.StandardMaterial("postMat", this.scene);
        postMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);

        const netMat = new BABYLON.StandardMaterial("netMat", this.scene);
        netMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        netMat.backFaceCulling = false;
        netMat.wireframe = true;
        netMat.alpha = 0.6;

        // --- Frame Construction ---
        const { leftPost, rightPost, crossbar, backTopBar, leftTopBar, rightTopBar, leftBackPost, rightBackPost } = this.createFrame(position, postMat);

        // --- Net Construction ---
        this.createNets(position, netMat, { crossbar, backTopBar, leftTopBar, rightTopBar, leftPost, rightPost, leftBackPost, rightBackPost });
    }

    createFrame(position, material) {
        // Helper to create cylinders
        const createBar = (name, height, diameter, pos, rotation) => {
            const mesh = BABYLON.MeshBuilder.CreateCylinder(name, { height, diameter }, this.scene);
            mesh.position = pos;
            if (rotation) mesh.rotation = rotation;
            mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.CylinderImpostor, { mass: 0 }, this.scene);
            mesh.material = material;
            return mesh;
        };

        const w = this.width;
        const h = this.height;
        const d = this.depth;
        const r = this.postRadius;

        // Front Posts
        const leftPost = createBar("leftPost", h, r * 2, new BABYLON.Vector3(position.x - w / 2, h / 2, position.z));
        const rightPost = createBar("rightPost", h, r * 2, new BABYLON.Vector3(position.x + w / 2, h / 2, position.z));

        // Crossbar
        const crossbar = createBar("crossbar", w + r * 2, r * 2, new BABYLON.Vector3(position.x, h, position.z), new BABYLON.Vector3(0, 0, Math.PI / 2));

        // Back Frame
        const leftBackPost = createBar("leftBackPost", h, r * 1.5, new BABYLON.Vector3(position.x - w / 2, h / 2, position.z + d));
        const rightBackPost = createBar("rightBackPost", h, r * 1.5, new BABYLON.Vector3(position.x + w / 2, h / 2, position.z + d));
        const backTopBar = createBar("backTopBar", w, r * 1.5, new BABYLON.Vector3(position.x, h, position.z + d), new BABYLON.Vector3(0, 0, Math.PI / 2));

        // Side Top Bars
        const leftTopBar = createBar("leftTopBar", d, r * 1.5, new BABYLON.Vector3(position.x - w / 2, h, position.z + d / 2), new BABYLON.Vector3(Math.PI / 2, 0, 0));
        const rightTopBar = createBar("rightTopBar", d, r * 1.5, new BABYLON.Vector3(position.x + w / 2, h, position.z + d / 2), new BABYLON.Vector3(Math.PI / 2, 0, 0));

        return { leftPost, rightPost, crossbar, backTopBar, leftTopBar, rightTopBar, leftBackPost, rightBackPost };
    }

    createNets(position, material, anchors) {
        // Dynamic Nets using Rigid Body Chains
        // This avoids SoftBody instability while providing movement.

        const chainCount = 20; // Number of vertical chains across the width
        const segmentCount = 6; // Segments per chain (vertical resolution)
        const segmentMass = 0.2; // Low mass for responsiveness

        // Calculate dimensions
        const chainSpacing = this.width / chainCount;
        const segmentHeight = this.height / segmentCount;
        const segmentWidth = chainSpacing * 0.9; // Slightly smaller to avoid friction between chains

        // Helper to create a chain
        const createChain = (xPos, zPos) => {
            let previousMesh = anchors.backTopBar; // Start connected to the top bar

            for (let i = 0; i < segmentCount; i++) {
                const yPos = this.height - (segmentHeight * i) - (segmentHeight / 2);

                const segment = BABYLON.MeshBuilder.CreateBox("netSeg", {
                    width: segmentWidth,
                    height: segmentHeight,
                    depth: 0.05
                }, this.scene);

                segment.position = new BABYLON.Vector3(xPos, yPos, zPos);
                segment.material = material;

                // Physics Impostor
                segment.physicsImpostor = new BABYLON.PhysicsImpostor(
                    segment,
                    BABYLON.PhysicsImpostor.BoxImpostor,
                    { mass: segmentMass, friction: 0.5, restitution: 0.1 },
                    this.scene
                );

                // Create Joint
                // Connect to previous mesh (either the bar or the segment above)
                const joint = new BABYLON.PhysicsJoint(BABYLON.PhysicsJoint.HingeJoint, {
                    mainPivot: new BABYLON.Vector3(0, -segmentHeight / 2, 0), // Bottom of previous
                    connectedPivot: new BABYLON.Vector3(0, segmentHeight / 2, 0), // Top of current
                    mainAxis: new BABYLON.Vector3(1, 0, 0), // Rotate around X axis
                    connectedAxis: new BABYLON.Vector3(1, 0, 0),
                    collision: true
                });

                if (i === 0) {
                    // Connection to the static bar needs different pivot logic
                    // The bar is horizontal, so we attach to its local frame
                    // We need to find the local offset on the bar corresponding to xPos
                    const localX = xPos - anchors.backTopBar.position.x;

                    // Re-define joint for the top connection
                    const topJoint = new BABYLON.PhysicsJoint(BABYLON.PhysicsJoint.HingeJoint, {
                        mainPivot: new BABYLON.Vector3(localX, 0, 0), // Local point on bar
                        connectedPivot: new BABYLON.Vector3(0, segmentHeight / 2, 0), // Top of segment
                        mainAxis: new BABYLON.Vector3(1, 0, 0),
                        connectedAxis: new BABYLON.Vector3(1, 0, 0),
                        collision: false
                    });
                    anchors.backTopBar.physicsImpostor.addJoint(segment.physicsImpostor, topJoint);
                } else {
                    // Segment to Segment
                    // Standard vertical connection
                    const interJoint = new BABYLON.PhysicsJoint(BABYLON.PhysicsJoint.BallAndSocketJoint, {
                        mainPivot: new BABYLON.Vector3(0, -segmentHeight / 2, 0),
                        connectedPivot: new BABYLON.Vector3(0, segmentHeight / 2, 0),
                        collision: true
                    });
                    previousMesh.physicsImpostor.addJoint(segment.physicsImpostor, interJoint);
                }

                previousMesh = segment;
            }
        };

        // Create Back Net Chains
        // We iterate along the width of the goal
        const startX = position.x - this.width / 2 + chainSpacing / 2;

        for (let c = 0; c < chainCount; c++) {
            const x = startX + (c * chainSpacing);
            const z = position.z + this.depth; // Back of the goal
            createChain(x, z);
        }

        // Side Nets (Simplified as static for now to save performance, or we can chain them too)
        // Let's keep side nets static for now to ensure we don't kill FPS, 
        // focusing the dynamic effect on the back where the ball usually hits.

        const createStaticSideNet = (name, pos, rot) => {
            const mesh = BABYLON.MeshBuilder.CreateBox(name, { width: this.depth, height: this.height, depth: 0.05 }, this.scene);
            mesh.position = pos;
            if (rot) mesh.rotation = rot;
            mesh.material = material;
            mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, this.scene);
        };

        createStaticSideNet("leftNet",
            new BABYLON.Vector3(position.x - this.width / 2, this.height / 2, position.z + this.depth / 2),
            new BABYLON.Vector3(0, Math.PI / 2, 0)
        );

        createStaticSideNet("rightNet",
            new BABYLON.Vector3(position.x + this.width / 2, this.height / 2, position.z + this.depth / 2),
            new BABYLON.Vector3(0, Math.PI / 2, 0)
        );

        // Top Net (Static)
        const topNet = BABYLON.MeshBuilder.CreateBox("topNet", { width: this.width, height: this.depth, depth: 0.05 }, this.scene);
        topNet.position = new BABYLON.Vector3(position.x, this.height, position.z + this.depth / 2);
        topNet.rotation.x = Math.PI / 2;
        topNet.material = material;
        topNet.physicsImpostor = new BABYLON.PhysicsImpostor(topNet, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, this.scene);

    }
}
