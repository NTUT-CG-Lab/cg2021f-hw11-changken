import { LittleTriangle } from './hsv.js'
import {  RGBType, HSVType } from './colorSpaceConvertor.js'

let instance = null

class InputModule {
	
	static getInstance(arg) {
		if (instance == null)
			instance = new InputModule(arg)

		return instance
	}

	static saveType = {
		ASCII: 0,
		BINARY: 1
    }

	static motionMode = 0;

	constructor(arg) {

		function isTriangle(x)
		{
			x = x - 100;
			for (let i = 0; i < arg.mylist.length; i++) {
				if ((arg.mylist[i].x - 10) < x && x < (arg.mylist[i].x + 10)) {
					arg.clickTriangle = arg.mylist[i]
					return true;
				}
			}
			return false;
		}

		function fillColor(t1, t2)
		{
			let rgb1 = t1.hsv.to_RGB();
			let rgb2 = t2.hsv.to_RGB();
			let frac = 0;

			for (let i = t1.x; i <= t2.x; i++) {
				frac = (i - t1.x) / (t2.x - t1.x);
				arg.rgba[0][i] = (1.0 - frac) * rgb1.R + frac * rgb2.R;
				arg.rgba[1][i] = (1.0 - frac) * rgb1.G + frac * rgb2.G;
				arg.rgba[2][i] = (1.0 - frac) * rgb1.B + frac * rgb2.B;
			}
		}

		function compare_list(first, second) {
			return first.x - second.x
		}

		function fillColorUpdate()
		{
			arg.mylist.sort(compare_list);
			for (let i = 0; i < arg.mylist.length - 1; i++) {
				fillColor(arg.mylist[i], arg.mylist[i + 1])
			}
		}

		function createTriangle(x, hsv)
		{
			let t = new LittleTriangle();
			t.x = x - 100;
			t.hsv = hsv;
			arg.mylist.push(t);
		}

		// 調色輪檢測
		let wheelDetection = function (x1, y1, central_x, central_y, radius_ex, radius_in) {
			let distance = Math.sqrt(Math.pow((x1 - central_x), 2.0) + Math.pow((y1 - central_y), 2.0));
			if (distance >= radius_in && distance <= radius_ex) {
				let angle = Math.atan2((y1 - central_y), (x1 - central_x)) * 180 / Math.PI;
				angle += 360;
				angle = parseInt(angle) % 360;
				console.log("angle = %f\n", angle);
				arg.clickH = parseInt(angle);
			}
		}

		// 調色盤(三角)檢測
		let triangleDetection = function (x1, y1, central_x, central_y, radius) {
			let a_x = central_x + (radius * Math.sin(240.0 / 57.29577957795135));
			let a_y = central_y + (radius * Math.cos(240.0 / 57.29577957795135));
			let b_x = central_x + (radius * Math.sin(120.0 / 57.29577957795135));
			let c_x = central_x + (radius * Math.sin(0.0));

			let triangle_y;
			if ((x1 - a_x) < (c_x - a_x))
				triangle_y = a_y + (x1 - a_x) * 1.732050807568877;
			else
				triangle_y = a_y + (b_x - x1) * 1.732050807568877;

			if (x1 >= a_x && x1 <= b_x && y1 >= a_y && y1 <= triangle_y) {

				arg.clickS = (((y1 - a_y) / 1.732050807568877) * 2) / (b_x - a_x);
				arg.clickV = (b_x - (x1 - ((y1 - a_y) / 1.732050807568877))) / (b_x - a_x);
			}

			console.log("hsv = (%f,%f,%f)\n", arg.clickH, arg.clickS, arg.clickV);
		}

		function HSVColorPalette(x, yy)
		{
			const CENTRAL_X = 300.0
			const CENTRAL_Y = 100.0
			const WHEEL_RADIUS = 80
			const wheel_thick = 20;

			if (x > 200 && x < 400 && yy > 0 && yy < 200) {
				wheelDetection(x, yy, CENTRAL_X, CENTRAL_Y, WHEEL_RADIUS, WHEEL_RADIUS - wheel_thick);
				triangleDetection(x, yy, CENTRAL_X, CENTRAL_Y, WHEEL_RADIUS, WHEEL_RADIUS - wheel_thick);
				if (arg.clickTriangle != null) {
					let hsv = arg.clickTriangle.hsv
					hsv.H = arg.clickH / 60.0;
					hsv.S = arg.clickS;
					hsv.V = arg.clickV;
					fillColorUpdate();
				}
			}
		}

		this.mouseButtHandler2 = function(state, x, y)
		{
			InputModule.motionMode = 0;
			let yy = 600 - y;
			console.log("mouse click, (%d, %d)\n", x, yy);
			if (state == 0) {
				if (x > 90 && x < (110 + 256) && yy > 285 && yy < 300) {
					InputModule.motionMode = 1;
					if (isTriangle(x) == false) {
						let hsv = new HSVType();
						hsv.H = arg.clickH / 60.0;
						hsv.S = arg.clickS;
						hsv.V = arg.clickV;
						//printf("(HSV: %f, %f, %f)\n", hsv.H, hsv.S, hsv.V);
						createTriangle(x, hsv);
						fillColorUpdate();
						isTriangle(x);
					}
					else {
						let ctHSV = arg.clickTriangle.hsv
						arg.clickH = ctHSV.H * 60
						arg.clickS = ctHSV.S
						arg.clickV = ctHSV.V
                    }
				}
				if (x >= 100 && x < (100 + 256) && yy >= 300 && yy < (300 + 180)) {
					InputModule.motionMode = 2;
				}
				HSVColorPalette(x, yy)
			}
			else if (state == 1) {
				if (x > 110 && x < (90 + 256) && yy > 285 && yy < 300) {
					if (isTriangle(x) == true) {
						let marker = arg.clickTriangle
						let index = arg.mylist.findIndex(element => element === marker)
						arg.mylist.splice(index, 1)
						arg.clickTriangle = null;
						fillColorUpdate();
					}
				}

				if (x >= 100 && x < (100 + 256) && yy >= 300 && yy < (300 + 180)) {
					for (let i = 0; i < 256; i++) {
						arg.path[i] = 0;
						arg.rgba[3][i] = arg.path[i] / 180.0;
					}
					arg.clickTriangle = null;
				}
            }
		}

		this.interpolation = function(x_old, y_old, x, y){
			console.log("old(%d, %d), new(%d, %d)\n", x_old, y_old, x, y);
			if (x_old == x) {
				arg.path[x_old] = y_old;
				if (arg.path[x_old] > 179)
					arg.path[x_old] = 179;
				else if (arg.path[x_old] < 0)
					arg.path[x_old] = 0;
			}
			else {
				let x_temp, y_temp;
				let x1 = x_old;
				let y1 = y_old;
				let x2 = x;
				let y2 = y;

				if (x1 > x2) {
					x_temp = x1;
					y_temp = y1;
					x1 = x2;
					y1 = y2;
					x2 = x_temp;
					y2 = y_temp;
				}

				for (let i = x1; i <= x2 && i < 256; i++) {
					if (i >= 0) {
						arg.path[i] = y1 + (i - x1) / (x2 - x1) * (y2 - y1);
						if (arg.path[i] < 0)
							arg.path[i] = 0;
						if (arg.path[i] > 179)
							arg.path[i] = 179;
						arg.rgba[3][i] = arg.path[i] /180.0;
					}
				}
			}
		}

		let x_old, y_old;
		this.mouseMoveHandler2 = function(x, y)
		{
			let yy = 600 - y;

			switch (InputModule.motionMode) {
				case 0:
				return;
				case 1: // Calculate the rotations
					if (yy <= 285) {
						yy = 286;
					}
					else if (yy >= 300) {
						yy = 299;
					}
					if (x <= 110) {
						x = 111;
					}
					else if (x >= 346) {
						x = 345;
					}

					let marker = arg.clickTriangle
					if (marker != null && marker.x != 0 && marker.x != 255) {
						marker.x = x - 100;
						fillColorUpdate();
					}

					HSVColorPalette(x, yy);
					x_old = x;
					y_old = yy;
					break;
				case 2:
					if (yy < 300) {
						yy = 300;
					}
					else if (yy >= 480) {
						yy = 479;
					}
					if (x < 100) {
						x = 100;
					}
					else if (x >= 356) {
						x = 355;
					}
					//path[x - 100] = yy -300;
					this.interpolation(x_old - 100, y_old - 300, x - 100, yy - 300);
					arg.clickTriangle = null;
					HSVColorPalette(x, yy);
					x_old = x;
					y_old = yy;
			}
		}

    }
}

export { InputModule }