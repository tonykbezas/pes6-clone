import * as BABYLON from 'babylonjs';
import Ball from './Ball.js';
import Goal from './Goal.js';

export default class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.engine = null;
        this.scene = null;
        this.ball = null;
        this.goal = null;
    }

    async start() {
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);

        await this.initializePhysics();
        this.createEnvironment();

        // Create Game Objects
        this.ball = new Ball(this.scene);
        this.ball.create(new BABYLON.Vector3(0, 5, 0));

        this.goal = new Goal(this.scene);
        this.goal.create(new BABYLON.Vector3(0, 0, 20));

        this.setupInputs();

        // Render Loop
        const debugDiv = document.getElementById('debugLog');
        if (debugDiv) debugDiv.style.display = 'block';

        this.engine.runRenderLoop(() => {
            this.scene.render();

            // Update Physics Viewer
            if (this.physicsViewer) {
                if (this.ball && this.ball.mesh && this.ball.mesh.physicsImpostor) {
                    this.physicsViewer.showImpostor(this.ball.mesh.physicsImpostor);
                }
                if (this.ground && this.ground.physicsImpostor) {
                    this.physicsViewer.showImpostor(this.ground.physicsImpostor);
                }
            }

            if (this.ball && this.ball.mesh) {
                // Auto-reset if ball falls through ground
                if (this.ball.mesh.position.y < -10) {
                    console.log("Ball fell through ground! Resetting...");
                    this.ball.reset();
                }

                if (debugDiv) {
                    const pos = this.ball.mesh.position;
                    const vel = this.ball.mesh.physicsImpostor ? this.ball.mesh.physicsImpostor.getLinearVelocity() : { x: 0, y: 0, z: 0 };
                    debugDiv.innerHTML = `
                        FPS: ${this.engine.getFps().toFixed()}<br>
                        Ball Y: ${pos.y.toFixed(2)}<br>
                        Ball Vel Y: ${vel.y !== undefined ? vel.y.toFixed(2) : 'N/A'}<br>
                        Physics Ready: ${this.scene.isPhysicsEnabled()}<br>
                        Ground Y: ${this.ground ? this.ground.position.y : 'N/A'}
                    `;
                }
            }
        });

        // Resize Event
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    async initializePhysics() {
        if (typeof Ammo === 'undefined') {
            console.error("Ammo is not loaded!");
            return;
        }

        // Initialize Ammo if it's a promise (modern builds)
        const ammo = await Ammo();

        // Initialize plugin
        // Arg 1: useSoftBodies (false for stability/matching example)
        // Arg 2: ammoInjection (the initialized instance)
        const physicsPlugin = new BABYLON.AmmoJSPlugin(false, ammo);
        // Enable physics with standard gravity matching the example
        this.scene.enablePhysics(new BABYLON.Vector3(0, -9.82, 0), physicsPlugin);

        // Fixed time step
        physicsPlugin.setTimeStep(1 / 60);

        console.log("Physics Initialized with Ammo.js (Standard Gravity, 10 Substeps)");

        // Enable Physics Viewer (Debug)
        const physicsViewer = new BABYLON.Debug.PhysicsViewer(this.scene);
        this.physicsViewer = physicsViewer; // Store reference
    }

    createEnvironment() {
        // Camera
        const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, new BABYLON.Vector3(0, 0, 0), this.scene);
        camera.attachControl(this.canvas, true);

        // Light
        new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);

        // Ground (Pitch) - Matches example_simplified.html
        // Width 100, Height 1, Depth 60. Position y = -0.5 (Top at 0).
        const ground = BABYLON.MeshBuilder.CreateBox("ground", { width: 100, height: 1, depth: 60 }, this.scene);
        ground.position.y = -0.5;
        this.ground = ground;

        const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2);
        ground.material = groundMaterial;

        // Physics Impostor - Matches example_simplified.html
        // Mass 0, Restitution 0.5, Friction 0.5
        ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5, friction: 0.5 }, this.scene);
    }

    setupInputs() {
        window.addEventListener("keydown", (e) => {
            if (e.key === 'r') {
                this.ball.reset();
            }
            if (e.key === ' ') {
                // Top spin shot
                this.ball.shoot(new BABYLON.Vector3(0, 1, 5), new BABYLON.Vector3(10, 0, 0));
            }
            if (e.key === 'ArrowLeft') {
                // Left curve
                this.ball.shoot(new BABYLON.Vector3(0, 1, 5), new BABYLON.Vector3(0, 10, 0));
            }
            if (e.key === 'ArrowRight') {
                // Right curve
                this.ball.shoot(new BABYLON.Vector3(0, 1, 5), new BABYLON.Vector3(0, -10, 0));
            }
            if (e.key === 'k') {
                // Manual Kick for Debug
                console.log("Kicking ball!");
                this.ball.mesh.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, -1, 0), this.ball.mesh.getAbsolutePosition());
            }
        });
    }
}
