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
        // Soft bodies are disabled to match the stable example. We use static boxes.
        const physicsParams = { mass: 0, friction: 0.5, restitution: 0.1 };

        // Helper for nets
        const createNetPart = (name, width, height, pos, rot) => {
            // Use Box instead of Ground for better collision thickness
            const mesh = BABYLON.MeshBuilder.CreateBox(name, { width, height, depth: 0.1 }, this.scene);
            mesh.position = pos;
            if (rot) mesh.rotation = rot;
            mesh.material = material;
            mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, physicsParams, this.scene);
        };

        // Top Net
        createNetPart("topNet", this.width, this.depth,
            new BABYLON.Vector3(position.x, this.height, position.z + this.depth / 2),
            new BABYLON.Vector3(Math.PI / 2, 0, 0) // Rotate to be flat on top
        );

        // Back Net
        createNetPart("backNet", this.width, this.height,
            new BABYLON.Vector3(position.x, this.height / 2, position.z + this.depth),
            null // Already vertical
        );

        // Left Net
        createNetPart("leftNet", this.depth, this.height,
            new BABYLON.Vector3(position.x - this.width / 2, this.height / 2, position.z + this.depth / 2),
            new BABYLON.Vector3(0, Math.PI / 2, 0)
        );

        // Right Net
        createNetPart("rightNet", this.depth, this.height,
            new BABYLON.Vector3(position.x + this.width / 2, this.height / 2, position.z + this.depth / 2),
            new BABYLON.Vector3(0, Math.PI / 2, 0)
        );
    }
}
