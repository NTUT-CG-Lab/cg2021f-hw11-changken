import * as THREE from './../threejs/build/three.module.js';
import { VolumeRenderShader1 } from './VolumeShader.js';
import { OrbitControls } from './../threejs/examples/jsm/controls/OrbitControls.js';

class threejsViewer {
  constructor(domElement) {
    let width = domElement.clientWidth;
    let height = domElement.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0xe6e6fa, 1.0);
    domElement.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    let unit = 1;
    let ratio = (width / height) * unit;
    this.camera = new THREE.OrthographicCamera(
      -ratio,
      ratio,
      unit,
      -unit,
      0.01,
      100
    );
    this.camera.position.set(8, 4, 8);
    this.scene.add(this.camera);

    // Light
    let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);

    this.scene.add(directionalLight);
    this.scene.add(new THREE.HemisphereLight(0x443333, 0x111122));

    // Controller
    let controller = new OrbitControls(this.camera, this.renderer.domElement);
    controller.target.set(0, 0.5, 0);
    controller.update();

    controller.addEventListener('change', () => {
      this.renderScene();
    });

    //Axis Landmark
    const axesHelper = new THREE.AxesHelper(100);
    this.scene.add(axesHelper);

    // Ground
    const plane = new THREE.Mesh(
      new THREE.CircleGeometry(2, 30),
      new THREE.MeshPhongMaterial({
        color: 0xbbddff,
        opacity: 0.4,
        transparent: true,
      })
    );
    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);

    this.renderScene = function () {
      //render scene
      this.renderer.render(this.scene, this.camera);
    };

    let getMinMax = function (dataBuffer) {
      if (dataBuffer.length <= 0) {
        return { min: 0, max: 0 };
      } else if (dataBuffer.length == 1) {
        return { min: dataBuffer[0], max: dataBuffer[0] };
      }

      let min = dataBuffer[0];
      let max = dataBuffer[0];
      for (let i = 0; i < dataBuffer.length; i++) {
        if (dataBuffer[i] > max) {
          max = dataBuffer[i];
        }
        if (dataBuffer[i] < min) {
          min = dataBuffer[i];
        }
      }

      return { min: min, max: max };
    };

    this.clear = function () {
      let mesh = this.scene.getObjectByName('volume');
      if (mesh != null) {
        this.scene.remove(mesh);
      }
    };

    this.mesh = null;

    //由影像資料生成模型
    this.renderVolume = function (volume, colormap, arg) {
      const name = 'volume';
      let dims = [64, 64, 64];
      let uniforms = null;
      let mesh = this.scene.getObjectByName(name);
      // let mesh = this.mesh;
      let scale = 1 / Math.max(...dims);

      if (mesh === null || mesh === undefined) {
        // first time initial
        //geometry
        let geometry = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
        //位移置中
        geometry.translate(dims[0] / 2, dims[1] / 2, dims[2] / 2);
        let shader = VolumeRenderShader1;
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        let texture = new THREE.DataTexture3D(
          volume.alpha,
          dims[0],
          dims[1],
          dims[2]
        );
        texture.format = THREE.LuminanceFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        // texture.unpackAlignment = 1;

        //256=>8bit, height 1
        let cmtexture = new THREE.DataTexture(
          colormap,
          256,
          1,
          THREE.RGBAFormat
        );

        uniforms['u_data'].value = texture;
        uniforms['u_size'].value.set(dims[0], dims[1], dims[2]);
        uniforms['u_cmdata'].value = cmtexture;
        uniforms['u_renderstyle'].value = arg.renderType;
        uniforms['u_sizeEnable'].value = 0;
        uniforms['u_sizeData'].value = null;
        uniforms['u_clim'].value.set(arg.cli_min, arg.cli_max);

        let material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader,
          side: THREE.BackSide,
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.name = name; //宣告名字
        mesh.position.set((-dims[0] * scale) / 2, 0, (-dims[2] * scale) / 2);
        mesh.scale.set(scale, scale, scale); //縮放or調整相機位置

        this.scene.add(mesh);
      } else {
        // partial parameters update
        //後續要調整要在material調整
        uniforms = mesh.material.uniforms;
        console.log(mesh.material.uniforms);
        // uniforms['u_cmdata'].value = new THREE.DataTexture(
        //   colormap,
        //   256,
        //   1,
        //   THREE.RGBAFormat
        // );
        //or
        uniforms['u_cmdata'].value.image = {
          data: colormap,
          width: 256,
          height: 1,
        };
        uniforms['u_cmdata'].value.needsUpdate = true;

        uniforms['u_renderstyle'].value = arg.renderType;
      }

      if (volume.used) {
        uniforms = mesh.material.uniforms;
        if (uniforms['u_sizeEnable'].value === 0) {
          //initialize: first time used
          let texture = new THREE.DataTexture3D(
            volume.alpha,
            dims[0],
            dims[1],
            dims[2],
            THREE.RGBAFormat
          );
          texture.format = THREE.LuminanceFormat;
          texture.type = THREE.UnsignedByteType;
          texture.minFilter = texture.magFilter = THREE.LinearFilter;

          uniforms['u_sizeEnable'].value = 1;
          uniforms['u_sizeData'].value = texture;
        } else {
          //no need initialize: second time used
          uniforms['u_sizeData'].value.image = {
            data: volume.sizeData,
          };
          uniforms['u_sizeData'].value.needsUpdate = true;
        }
      }

      this.renderScene();
    };

    this.renderScene();
  }
}

export { threejsViewer };
