import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "lil-gui";

const App = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    let camera, scene, renderer, controls, globe, clock;
    const guiElements = [];

    const init = () => {
      clock = new THREE.Clock();

      // Kamera
      camera = new THREE.PerspectiveCamera(
        25,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.set(4.5, 2, 3);

      // Sahne
      scene = new THREE.Scene();

      // Işık Kaynağı (Güneş)
      const sun = new THREE.DirectionalLight("#ffffff", 2);
      sun.position.set(0, 0, 3);
      scene.add(sun);

      // Tekstür Yükleme
      const textureLoader = new THREE.TextureLoader();

      const dayTexture = textureLoader.load(
        `${process.env.PUBLIC_URL}/textures/earth_day_4096.jpg`
      );

      const nightTexture = textureLoader.load(
        `${process.env.PUBLIC_URL}/textures/earth_night_4096.jpg`
      );

      const bumpRoughnessCloudsTexture = textureLoader.load(
        `${process.env.PUBLIC_URL}/textures/earth_bump_roughness_clouds_4096.jpg`
      );

      // Shader Malzeme: Gece/Gündüz Geçişi
      const globeMaterial = new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: dayTexture },
          nightTexture: { value: nightTexture },
          bumpMap: { value: bumpRoughnessCloudsTexture },
          lightDirection: { value: new THREE.Vector3(0, 0, 1) },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D dayTexture;
          uniform sampler2D nightTexture;
          uniform vec3 lightDirection;
          varying vec3 vNormal;
          varying vec3 vPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(lightDirection);

            // Gündüz ve gece hesaplaması
            float intensity = dot(normal, lightDir);

            // Küre koordinatları için UV hesaplama
            vec2 uv = vec2(
              0.5 + atan(vPosition.z, vPosition.x) / (2.0 * 3.14159265358979323846264),
              0.5 - asin(vPosition.y) / 3.14159265358979323846264
            );

            vec4 dayColor = texture2D(dayTexture, uv);
            vec4 nightColor = texture2D(nightTexture, uv);

            // Gündüz ve geceyi karıştır
            vec4 color = mix(nightColor, dayColor, max(intensity, 0.0));
            gl_FragColor = color;
          }
        `,
      });

      const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
      globe = new THREE.Mesh(sphereGeometry, globeMaterial);

      // Küreyi ters çevirerek düzelt
      globe.rotation.y = Math.PI;
      globe.rotation.x = Math.PI;
      scene.add(globe);

      // Atmosfer
      const atmosphereMaterial = new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.2,
        color: "#4db2ff",
      });

      const atmosphere = new THREE.Mesh(sphereGeometry, atmosphereMaterial);
      atmosphere.scale.set(1.04, 1.04, 1.04);
      scene.add(atmosphere);

      // Renderer
      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      mountRef.current.appendChild(renderer.domElement);

      // Kontroller
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // GUI
      const gui = new GUI();
      guiElements.push(gui);

      gui.add(globeMaterial.uniforms.lightDirection.value, "x", -1, 1, 0.01).name("Light X");
      gui.add(globeMaterial.uniforms.lightDirection.value, "y", -1, 1, 0.01).name("Light Y");
      gui.add(globeMaterial.uniforms.lightDirection.value, "z", -1, 1, 0.01).name("Light Z");

      // Event Listener
      window.addEventListener("resize", onWindowResize);
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      const delta = clock.getDelta();
      globe.rotation.y += delta * 0.025;

      controls.update();
      renderer.render(scene, camera);

      requestAnimationFrame(animate);
    };

    init();
    animate();

    // Cleanup
    return () => {
      guiElements.forEach((gui) => gui.destroy());
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
};

export default App;
