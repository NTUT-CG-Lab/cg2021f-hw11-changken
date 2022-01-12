import * as THREE from './../threejs/build/three.module.js'
import { RGBType, HSVType } from './colorSpaceConvertor.js'

let instance = null

class HSV {

    static getInstance() {
        if (instance == null) {
            instance = new HSV()
        }

        return instance
    }

    constructor() {

        const CENTRAL_X = 300.0
        const CENTRAL_Y = 100.0
        const WHEEL_RADIUS = 80
        const wheel_thick = 20;

        // HSV 調色輪
        this.drawColorWheel = function () {

            const outline = WHEEL_RADIUS
            const inside = WHEEL_RADIUS - wheel_thick

            let tx1 = CENTRAL_X + outline;
            let ty1 = CENTRAL_Y;
            let bx1 = CENTRAL_X + inside;
            let by1 = CENTRAL_Y;
            let tx2, ty2, bx2, by2;
            let angle;

            let color = new Float32Array(361 * 18)
            let vertex = new Float32Array(361 * 18)

            for (let i = 1; i <= 360; i++) {
                let hsv = new HSVType().set(i % 360 / 60, 1, 1)
                let rgb = hsv.to_RGB();

                color.set([
                    rgb.R, rgb.G, rgb.B,
                    rgb.R, rgb.G, rgb.B,
                    rgb.R, rgb.G, rgb.B,

                    rgb.R, rgb.G, rgb.B,
                    rgb.R, rgb.G, rgb.B,
                    rgb.R, rgb.G, rgb.B
                ], i * 18);

                angle = i / 180 * Math.PI; // * 180.0 / 3.14

                tx2 = CENTRAL_X + (outline * Math.cos(angle));
                ty2 = CENTRAL_Y + (outline * Math.sin(angle));
                bx2 = CENTRAL_X + (inside * Math.cos(angle));
                by2 = CENTRAL_Y + (inside * Math.sin(angle));

                vertex.set([
                    bx1, by1, 0,
                    tx1, ty1, 0,
                    tx2, ty2, 0,
                    bx1, by1, 0,
                    tx2, ty2, 0,
                    bx2, by2, 0
                ], i * 18);

                ty1 = ty2;
                tx1 = tx2;
                by1 = by2;
                bx1 = bx2;
            }

            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))
            geometry.setAttribute('color', new THREE.BufferAttribute(color, 3))

            const material = new THREE.MeshBasicMaterial()
            material.setValues({ vertexColors: THREE.VertexColors })

            return new THREE.Mesh(geometry, material)
        }

        // 調色盤(三角)
        this.drawTriangle = function (h) {
            const radius = WHEEL_RADIUS - wheel_thick
            let hsv = new HSVType()

            hsv.H = h;
            hsv.S = 0.0;
            hsv.V = 1.0;
            let a = hsv.to_RGB();

            hsv.S = 0.0;
            hsv.V = 0.0;
            let b = hsv.to_RGB();

            hsv.S = 1.0;
            hsv.V = 1.0;
            let c = hsv.to_RGB();

            let step = 120.0 / 57.29577957795135
            const vector = new Float32Array([
                CENTRAL_X + radius * Math.sin(step * 2), CENTRAL_Y + radius * Math.cos(step * 2), 0,
                CENTRAL_X + radius * Math.sin(step), CENTRAL_Y + radius * Math.cos(step), 0,
                CENTRAL_X + radius * Math.sin(0.0), CENTRAL_Y + radius * Math.cos(0.0), 0
            ])

            const color = new Float32Array([
                a.R, a.G, a.B,
                b.R, b.G, b.B,
                c.R, c.G, c.B
            ])

            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vector, 3))
            geometry.setAttribute('color', new THREE.BufferAttribute(color, 3))

            const material = new THREE.MeshBasicMaterial()
            material.setValues({ vertexColors: THREE.VertexColors })

            return new THREE.Mesh(geometry, material)
        }

        this.drawLittleTriangle = function (t) {

            let vertex = new Float32Array([
                100 + t.x, 300, 0,
                100 + t.x - 10, 300 - 15, 0,
                100 + t.x + 10, 300 - 15, 0
            ])

            let rgb = t.hsv.to_RGB();

            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            const material = new THREE.MeshBasicMaterial()
            material.setValues({color: new THREE.Color(rgb.R, rgb.G, rgb.B)})

            return new THREE.Mesh(geometry, material)
        }

        this.updateLittleTriangle = function (mylist, target) {
            let group = new THREE.Group()
            for (let i = 0; i < mylist.length; i++) {
                group.add(this.drawLittleTriangle(mylist[i]))
            }

            if (target != null) {
                let vertex = new Float32Array([
                    100 + target.x + 4, 300 - 25, 0,
                    100 + target.x + 4, 300 - 15, 0,
                    100 + target.x - 3, 300 - 15, 0,
                    100 + target.x + 4, 300 - 25, 0,
                    100 + target.x - 3, 300 - 15, 0,  
                    100 + target.x - 3, 300 - 25, 0
                ])

                let rgb = target.hsv.to_RGB()

                const geometry = new THREE.BufferGeometry()
                geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

                const material = new THREE.MeshBasicMaterial()
                material.setValues({ color: new THREE.Color(rgb.R, rgb.G, rgb.B) })
      
                group.add(new THREE.Mesh(geometry, material))
            }

            return group
        }

        function string_render(text, x, y, r, g, b, font) {
            const geometry = new THREE.TextGeometry(text, {
                font: font,
                size: 12
            })
            geometry.translate(x, y, 0)

            const material = new THREE.MeshBasicMaterial()
            material.setValues({ 'color': new THREE.Color(r, g, b) })

            return new THREE.Mesh(geometry, material)
        }

        let histogramText = null
        this.drawHistogram = function (font) {

            let geometry, material, vertex, group

            // 刻度
            if (histogramText == null) {
                let subGroup = new THREE.Group()

                for (let i = 0; i < 600; i += 100) {
                    subGroup.add(string_render(i.toString(), 1, i, 0.5, 0.5, 0.5, font))
                }
                
                histogramText = subGroup
            }

            group = new THREE.Group()
            group.add(histogramText.clone())

            // 統計圖表框線
            vertex = new Float32Array([
                100, 300 + 200, 0,
                100 + 256, 300 + 200, 0,
                100 + 256, 300 + 299, 0,
                100, 300 + 299, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0xffffff })

            group.add(new THREE.LineLoop(geometry, material))

            vertex = new Float32Array([
                100, 300 - 15, 0,
                100 + 256, 300 - 15, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0xffffff })

            group.add(new THREE.LineSegments(geometry, material))

            vertex = new Float32Array([
                100, 300, 0,
                100 + 256, 300, 0,
                100 + 256, 300 + 180, 0,
                100, 300 + 180, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0xffffff })

            group.add(new THREE.LineLoop(geometry, material))

            vertex = new Float32Array([
                300, 200, 0,
                350, 225, 0,
                300, 250, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0x00ffff })

            group.add(new THREE.Mesh(geometry, material))

            return group
        }

        // 灰度->色階的Alpha變化曲線
        this.drawPath = function (path) {
            let vertex = new Array()
            for (let i = 0; i < 256; i++)
                vertex.push(new THREE.Vector2(100 + i, 300 + path[i]))
            let geometry = new THREE.BufferGeometry().setFromPoints(vertex)

            return new THREE.Line(geometry)
        }

        this.getMinMax = function (array) {
            if (array.length <= 0) {
                return {min:0, max:0}
            }

            let minValue = array[0]
            let maxValue = array[0]
            for (let i = 1; i < array.length; i++) {
                if (array[i] > maxValue) {
                    maxValue = array[i]
                }
                else if (array[i] < minValue) {
                    minValue = array[i]
                }
            }

            return { min: minValue, max: maxValue}
        }

        // 灰度分布統計圖表
        this.drawLog = function (histogram) {
            let material, geometry, vertex, group, process
            group = new THREE.Group()
            let max = this.getMinMax(histogram).max

            // draw line chart
            vertex = new Float32Array(256 * 3)

            if (this.isHistogramLog10)
                process = function (i) {
                    let y = max
                    if (histogram[i] != 0) {
                        y = Math.log10(histogram[i]) + 500
                    }
                    vertex.set([
                        100 + i, y, 0
                    ], 3 * i)
                }
            else 
                process = function (i) {
                    vertex.set([
                        100 + i, 500 + histogram[i] / max * 100, 0
                    ], 3 * i)
                }

            if (max == 0) {
                vertex.fill(0)
            }
            else {
                for (let i = 0; i < 256; i++)
                    process(i)
            }

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({
                'color': 0xffffff
            })

            group.add(new THREE.Line(geometry, material))

            // fill color into the chart
            vertex = new Float32Array(256 * 6)
            if (this.isHistogramLog10)
                process = function (i) {
                    let y = max
                    if (histogram[i] != 0) {
                        y = Math.log10(histogram[i]) + 500
                    }
                    vertex.set([
                        100 + i, y, 0,
                        100 + i, 500, 0
                    ], 6 * i)
                }
            else
                process = function (i) {
                    vertex.set([
                        100 + i, 500 + histogram[i] / max * 100, 0,
                        100 + i, 500, 0
                    ], 6 * i)
                }

            if (max == 0) {
                vertex.fill(0)
            }
            else {
                for (let i = 0; i < 256; i++)
                    process(i)
            }

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({
                color: 0x0000ff
            })

            group.add(new THREE.LineSegments(geometry, material))

            return group
        }

        // 灰度->RGBA色階映射
        this.drawColorSample = function (rgba) {
            let geometry, material, vertex, color, group

            vertex = new Float32Array(256 * 6)
            color = new Float32Array(256 * 6)
            group = new THREE.Group()

            for (let i = 0; i < 256; i++) {
                color.set([
                    rgba[0][i] * rgba[3][i], rgba[1][i] * rgba[3][i], rgba[2][i] * rgba[3][i],
                    rgba[0][i] * rgba[3][i], rgba[1][i] * rgba[3][i], rgba[2][i] * rgba[3][i]
                ], i * 6);

                vertex.set([
                    100 + i, 480, 0,
                    100 + i, 500, 0
                ], i * 6); 
            }

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))
            geometry.setAttribute('color', new THREE.BufferAttribute(color, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ vertexColors: THREE.VertexColors })

            group.add(new THREE.LineSegments(geometry, material))

            vertex = new Float32Array([
                356, 480, 0,
                100, 480, 0,
                100, 500, 0,
                356, 500, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0xffffff })

            group.add(new THREE.LineLoop(geometry))

            return group
        }

        // 灰度->RGB色階映射
        this.drawRainbow = function (rgba) {

            let vertex = new Float32Array(256 * 6)
            let color = new Float32Array(256 * 6)

            for (let i = 0; i < 256; i++) {
                color.set([
                    rgba[0][i], rgba[1][i], rgba[2][i],
                    rgba[0][i], rgba[1][i], rgba[2][i]
                ], i * 6);

                vertex.set([
                    100 + i, 300, 0,
                    100 + i, 300 + 180, 0
                ], i * 6)
            }

            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))
            geometry.setAttribute('color', new THREE.BufferAttribute(color, 3))

            const material = new THREE.LineBasicMaterial()
            material.setValues({ vertexColors: THREE.VertexColors })

            return new THREE.LineSegments(geometry, material)
        }

        
    }


}


class LittleTriangle {
    constructor() {
        this.x = 0
        this.hsv = new HSVType()
        this.hsv.set(0, 1, 1)

        this.compare = function (t) {
            return x == t.x
        }
    }
}

export { HSV, LittleTriangle }








