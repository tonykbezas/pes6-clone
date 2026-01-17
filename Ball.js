import * as BABYLON from 'babylonjs';

export default class Ball {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.magnusMultiplier = 0.2;
        this.startPosition = new BABYLON.Vector3(0, 5, 0); // Raise to 5m for debug
    }

    create(position = this.startPosition) {
        // 1. Create the Physics Root (Invisible, Larger for stability)
        // Diameter 1m -> Radius 0.5m. This is what interacts with the world.
        this.mesh = BABYLON.MeshBuilder.CreateSphere("ballPhysicsRoot", { diameter: 1 }, this.scene);
        this.mesh.position = position.clone();
        this.mesh.visibility = 0; // Invisible

        // 2. Create the Visual Mesh (Visible, Realistic size)
        // Diameter 1m -> Radius 0.5m.
        this.visualMesh = BABYLON.MeshBuilder.CreateSphere("ballVisual", { diameter: 1 }, this.scene);
        this.visualMesh.parent = this.mesh;

        // Offset visual mesh so its bottom aligns with the physics root's bottom
        // Physics Radius (0.5) - Visual Radius (0.5) = 0 difference
        this.visualMesh.position.y = 0;

        // Material for Visual Mesh
        const ballMaterial = new BABYLON.StandardMaterial("ballMat", this.scene);
        ballMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        this.visualMesh.material = ballMaterial;

        // 3. Physics for Root
        // Matches example_simplified.html: Mass 1, Restitution 0.9, Friction 0.5
        this.mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.mesh,
            BABYLON.PhysicsImpostor.SphereImpostor,
            { mass: 1.0, restitution: 0.9, friction: 0.5 },
            this.scene
        );

        // Explicitly set damping (optional, but good for stability)
        this.mesh.physicsImpostor.physicsBody.setDamping(0.1, 0);

        // CCD: The simplified example works WITHOUT explicit CCD calls because of the high substeps.
        // We will comment them out to match the example exactly. If tunneling returns, we can re-enable them.
        /*
        if (this.mesh.physicsImpostor.physicsBody) {
            this.mesh.physicsImpostor.physicsBody.setCcdMotionThreshold(0.05);
            this.mesh.physicsImpostor.physicsBody.setCcdSweptSphereRadius(0.4);
        }
        */

        // Force wake up
        this.mesh.physicsImpostor.wakeUp();

        // Hook into physics step for Magnus Effect
        this.scene.onBeforePhysicsObservable.add(() => {
            this.applyMagnusEffect();
        });
    }

    applyMagnusEffect() {
        if (!this.mesh || !this.mesh.physicsImpostor) return;

        const velocity = this.mesh.physicsImpostor.getLinearVelocity();
        const angularVelocity = this.mesh.physicsImpostor.getAngularVelocity();

        if (velocity && angularVelocity) {
            // Magnus Force = (AngularVelocity x LinearVelocity) * Multiplier
            const magnusForce = BABYLON.Vector3.Cross(angularVelocity, velocity).scale(this.magnusMultiplier);
            this.mesh.physicsImpostor.applyForce(magnusForce, this.mesh.getAbsolutePosition());
        }
    }

    shoot(impulse, angularVelocity) {
        if (!this.mesh || !this.mesh.physicsImpostor) return;

        this.mesh.physicsImpostor.applyImpulse(impulse, this.mesh.getAbsolutePosition());
        this.mesh.physicsImpostor.setAngularVelocity(angularVelocity);
    }

    reset() {
        if (!this.mesh || !this.mesh.physicsImpostor) return;

        this.mesh.position = this.startPosition.clone();
        this.mesh.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
        this.mesh.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));

        // Reset rotation to look nice
        this.mesh.rotation = new BABYLON.Vector3(0, 0, 0);
    }
}
